import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildApp } from "../../app.js";
import tenantManagementApiRoute from "./tenantManagementApi.js";

const BOOTSTRAP_ENV = "TENANT_MANAGEMENT_BOOTSTRAP_KEY";
const BOOTSTRAP_HEADER = "x-tenant-management-bootstrap-key";

const dbMocks = vi.hoisted(() => {
  const selectRowsQueue: unknown[][] = [];

  function nextSelectRows() {
    return selectRowsQueue.shift() ?? [];
  }

  function createSelectChain() {
    const chain = {
      from: () => createSelectChain(),
      where: () => createSelectChain(),
      orderBy: () => createSelectChain(),
      limit: () => Promise.resolve(nextSelectRows()),
      then: (resolve: (value: unknown[]) => unknown, reject?: (reason: unknown) => unknown) =>
        Promise.resolve(nextSelectRows()).then(resolve, reject),
    };
    return chain;
  }

  const mockSelect = vi.fn(() => createSelectChain());
  const mockInsertValues = vi.fn(() => Promise.resolve());
  const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

  return {
    selectRowsQueue,
    mockSelect,
    mockInsert,
    mockInsertValues,
  };
});

vi.mock("../../db/client.js", () => ({
  db: {
    select: dbMocks.mockSelect,
    insert: dbMocks.mockInsert,
  },
}));

async function createRouteApp() {
  const app = await buildApp({ logger: false, registerDefaultRoutes: false });
  await app.register(tenantManagementApiRoute);
  return app;
}

describe("tenantManagementApi /init-api-key bootstrap protection", () => {
  const originalBootstrapEnv = process.env[BOOTSTRAP_ENV];

  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.selectRowsQueue.length = 0;
  });

  afterEach(() => {
    if (originalBootstrapEnv === undefined) {
      delete process.env[BOOTSTRAP_ENV];
    } else {
      process.env[BOOTSTRAP_ENV] = originalBootstrapEnv;
    }
  });

  it("returns 503 when bootstrap env is not configured", async () => {
    delete process.env[BOOTSTRAP_ENV];

    const app = await createRouteApp();
    const res = await app.inject({
      method: "POST",
      url: "/init-api-key",
    });
    await app.close();

    expect(res.statusCode).toBe(503);
    expect(dbMocks.mockInsertValues).not.toHaveBeenCalled();
  });

  it("returns 401 when bootstrap header is missing or invalid", async () => {
    process.env[BOOTSTRAP_ENV] = "bootstrap-secret";

    const app = await createRouteApp();

    const noHeader = await app.inject({ method: "POST", url: "/init-api-key" });
    expect(noHeader.statusCode).toBe(401);

    const wrongHeader = await app.inject({
      method: "POST",
      url: "/init-api-key",
      headers: { [BOOTSTRAP_HEADER]: "wrong" },
    });
    await app.close();

    expect(wrongHeader.statusCode).toBe(401);
    expect(dbMocks.mockInsertValues).not.toHaveBeenCalled();
  });

  it("returns 409 when API key is already initialized", async () => {
    process.env[BOOTSTRAP_ENV] = "bootstrap-secret";
    dbMocks.selectRowsQueue.push([{ configKey: "tenant_management_api_key", configValue: "existing" }]);

    const app = await createRouteApp();
    const res = await app.inject({
      method: "POST",
      url: "/init-api-key",
      headers: { [BOOTSTRAP_HEADER]: "bootstrap-secret" },
    });
    await app.close();

    expect(res.statusCode).toBe(409);
    expect(dbMocks.mockInsertValues).not.toHaveBeenCalled();
  });

  it("returns 201 and stores key with valid bootstrap header", async () => {
    process.env[BOOTSTRAP_ENV] = "bootstrap-secret";
    dbMocks.selectRowsQueue.push([]);

    const app = await createRouteApp();
    const res = await app.inject({
      method: "POST",
      url: "/init-api-key",
      headers: { [BOOTSTRAP_HEADER]: "bootstrap-secret" },
    });
    await app.close();

    expect(res.statusCode).toBe(201);
    expect(dbMocks.mockInsert).toHaveBeenCalledTimes(1);
    expect(dbMocks.mockInsertValues).toHaveBeenCalledTimes(1);

    const body = res.json() as Record<string, unknown>;
    expect(body.message).toBe("Tenant management API key initialized");
    expect(typeof body.api_key).toBe("string");
    expect((body.api_key as string).startsWith("sk-")).toBe(true);
  });
});
