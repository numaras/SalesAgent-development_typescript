import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildApp } from "../../app.js";
import schemasRootRoute from "./root.js";

const mockCreateSchemaRegistry = vi.fn();
const mockGetSchemaFromRegistry = vi.fn();
const mockListSchemaNames = vi.fn();
vi.mock("../../services/schemaRegistryService.js", () => ({
  createSchemaRegistry: (...args: unknown[]) => mockCreateSchemaRegistry(...args),
  getSchema: (...args: unknown[]) => mockGetSchemaFromRegistry(...args),
  listSchemaNames: (...args: unknown[]) => mockListSchemaNames(...args),
}));

const mockBuildSchemasRootPayload = vi.fn();
const mockBuildSchemasVersionsPayload = vi.fn();
const mockGetSchemasHealthPayload = vi.fn();
vi.mock("../../services/schemasRouteService.js", () => ({
  buildSchemasRootPayload: (...args: unknown[]) =>
    mockBuildSchemasRootPayload(...args),
  buildSchemasVersionsPayload: (...args: unknown[]) =>
    mockBuildSchemasVersionsPayload(...args),
  getSchemasHealthPayload: (...args: unknown[]) =>
    mockGetSchemasHealthPayload(...args),
}));

async function createSchemasApp() {
  const app = await buildApp({ logger: false, registerDefaultRoutes: false });
  await app.register(schemasRootRoute, { prefix: "/schemas" });
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();

  mockCreateSchemaRegistry.mockReturnValue({ registry: true });
  mockListSchemaNames.mockReturnValue(["get_products", "list_creatives"]);
  mockGetSchemaFromRegistry.mockImplementation((_registry: unknown, name: unknown) => {
    if (name === "get_products") {
      return { $schema: "https://json-schema.org/draft/2020-12/schema", type: "object" };
    }
    return null;
  });

  mockBuildSchemasRootPayload.mockReturnValue({
    protocols: {
      adcp: {
        description: "AdCP schemas",
        versions: ["v2.4"],
        current_version: "v2.4",
        url: "http://localhost/schemas/adcp/",
      },
    },
    description: "Root",
    schema_version: "draft-2020-12",
  });
  mockBuildSchemasVersionsPayload.mockReturnValue({
    available_versions: ["v2.4"],
    current_version: "v2.4",
    description: "Versions",
    latest_url: "http://localhost/schemas/adcp/v2.4/",
  });
  mockGetSchemasHealthPayload.mockReturnValue({
    status: "healthy",
    schemas_available: 2,
    service: "AdCP Schema Validation Service",
    version: "v2.4",
  });
});

describe("Schema-service route validation coverage", () => {
  it("GET /schemas/ returns root payload", async () => {
    const app = await createSchemasApp();
    const res = await app.inject({ method: "GET", url: "/schemas/" });
    await app.close();

    expect(res.statusCode).toBe(200);
    expect(mockBuildSchemasRootPayload).toHaveBeenCalledOnce();
  });

  it("GET /schemas/adcp/ returns versions payload", async () => {
    const app = await createSchemasApp();
    const res = await app.inject({ method: "GET", url: "/schemas/adcp/" });
    await app.close();

    expect(res.statusCode).toBe(200);
    expect(mockBuildSchemasVersionsPayload).toHaveBeenCalledOnce();
  });

  it("GET /schemas/health returns service health payload", async () => {
    const app = await createSchemasApp();
    const res = await app.inject({ method: "GET", url: "/schemas/health" });
    await app.close();

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: "healthy" });
  });

  it("GET /schemas/adcp/v2.4/ returns index", async () => {
    const app = await createSchemasApp();
    const res = await app.inject({ method: "GET", url: "/schemas/adcp/v2.4/" });
    await app.close();

    expect(res.statusCode).toBe(200);
    const body = res.json() as { schemas: Record<string, unknown> };
    expect(body.schemas).toHaveProperty("get_products");
  });

  it("GET /schemas/adcp/v2.4/index.json returns index", async () => {
    const app = await createSchemasApp();
    const res = await app.inject({ method: "GET", url: "/schemas/adcp/v2.4/index.json" });
    await app.close();

    expect(res.statusCode).toBe(200);
    const body = res.json() as { schemas: Record<string, unknown> };
    expect(body.schemas).toHaveProperty("list_creatives");
  });

  it("GET /schemas/adcp/v2.4/:schemaName returns schema when found", async () => {
    const app = await createSchemasApp();
    const res = await app.inject({
      method: "GET",
      url: "/schemas/adcp/v2.4/get_products.json",
    });
    await app.close();

    expect(res.statusCode).toBe(200);
    expect(mockGetSchemaFromRegistry).toHaveBeenCalled();
  });

  it("GET /schemas/adcp/v2.4/:schemaName returns 404 when not found", async () => {
    const app = await createSchemasApp();
    const res = await app.inject({
      method: "GET",
      url: "/schemas/adcp/v2.4/unknown-schema",
    });
    await app.close();

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({
      error: "Schema not found",
      requested_schema: "unknown-schema",
    });
  });
});