import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyPluginAsync } from "fastify";

import { buildApp } from "../../app.js";
import adapterConfigRoute from "./adapters/adapterConfig.js";
import broadstreetRoute from "./adapters/broadstreet.js";
import capabilitiesRoute from "./adapters/capabilities.js";
import gamConfigRoute from "./adapters/gamConfig.js";
import inventorySchemaRoute from "./adapters/inventorySchema.js";
import mockConfigRoute from "./adapters/mockConfig.js";
import mockConnectionConfigRoute from "./adapters/mockConnectionConfig.js";
import gamAdvertisersRoute from "./api/gamAdvertisers.js";
import productsListApiRoute from "./api/productsList.js";
import revenueChartRoute from "./api/revenueChart.js";
import customTargetingRoute from "./gam/customTargeting.js";
import detectConfigureRoute from "./gam/detectConfigure.js";
import lineItemRoute from "./gam/lineItem.js";
import serviceAccountRoute from "./gam/serviceAccount.js";
import syncStatusRoute from "./gam/syncStatus.js";

const mockRequireTenantAccess = vi.fn();
vi.mock("../services/authGuard.js", () => ({
  requireTenantAccess: (...args: unknown[]) => mockRequireTenantAccess(...args),
}));

let sessionState: Record<string, unknown> = {};
vi.mock("../services/sessionService.js", () => ({
  getAdminSession: () => sessionState,
}));

const selectRowsQueue: unknown[][] = [];
const insertRowsQueue: unknown[][] = [];

function nextSelectRows() {
  return selectRowsQueue.shift() ?? [];
}

function createSelectChain() {
  const chain = {
    where: () => createSelectChain(),
    orderBy: () => createSelectChain(),
    limit: () => Promise.resolve(nextSelectRows()),
    then: (resolve: (value: unknown[]) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(nextSelectRows()).then(resolve, reject),
  };
  return chain;
}

const mockSelect = vi.fn(() => ({ from: () => createSelectChain() }));
const mockUpdateWhere = vi.fn(() => Promise.resolve());
const mockUpdateSet = vi.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }));

const mockInsertValues = vi.fn(() => ({
  returning: () => Promise.resolve(insertRowsQueue.shift() ?? []),
  then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(insertRowsQueue.shift() ?? []).then(resolve, reject),
}));
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

vi.mock("../../db/client.js", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}));

const mockBuildGamDiscoveryClient = vi.fn();
const mockBuildGamClient = vi.fn();
vi.mock("../../gam/gamClient.js", () => ({
  buildGamDiscoveryClient: (...args: unknown[]) => mockBuildGamDiscoveryClient(...args),
  buildGamClient: (...args: unknown[]) => mockBuildGamClient(...args),
}));

async function createRouteApp(routePlugin: FastifyPluginAsync) {
  const app = await buildApp({ logger: false, registerDefaultRoutes: false });
  await app.register(routePlugin);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  selectRowsQueue.length = 0;
  insertRowsQueue.length = 0;
  sessionState = { user: "admin@example.com", role: "super_admin", tenant_id: "tenant-1" };
  mockRequireTenantAccess.mockResolvedValue(true);

  delete process.env.GCP_PROJECT_ID;
  process.env.GAM_OAUTH_CLIENT_ID = "client-id";
  process.env.GAM_OAUTH_CLIENT_SECRET = "client-secret";
});

describe("Admin schema-bound routes (adapters, gam, api)", () => {
  it("adapterConfig returns 400 when adapter_type is missing", async () => {
    const app = await createRouteApp(adapterConfigRoute);
    const res = await app.inject({
      method: "POST",
      url: "/api/tenant/tenant-1/adapter-config",
      payload: { config: {} },
    });
    await app.close();
    expect(res.statusCode).toBe(400);
  });

  it("capabilities returns 404 for unknown adapter type", async () => {
    const app = await createRouteApp(capabilitiesRoute);
    const res = await app.inject({ method: "GET", url: "/api/adapters/unknown/capabilities" });
    await app.close();
    expect(res.statusCode).toBe(404);
  });

  it("inventorySchema returns 200 with schema metadata", async () => {
    const app = await createRouteApp(inventorySchemaRoute);
    const res = await app.inject({ method: "GET", url: "/tenant/tenant-1/adapter/mock/inventory_schema" });
    await app.close();
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      adapter_name: "mock",
      supports_inventory_sync: false,
      entities: [],
    });
  });

  it("gamConfig GET returns 401 when session is missing", async () => {
    sessionState = {};
    const app = await createRouteApp(gamConfigRoute);
    const res = await app.inject({ method: "GET", url: "/adapters/gam/config/tenant-1/product-1" });
    await app.close();
    expect(res.statusCode).toBe(401);
  });

  it("gamConfig POST returns 400 on invalid config payload", async () => {
    selectRowsQueue.push([{ productId: "product-1", implementationConfig: {} }]);
    const app = await createRouteApp(gamConfigRoute);
    const res = await app.inject({
      method: "POST",
      url: "/adapters/gam/config/tenant-1/product-1",
      payload: { any: "value" },
    });
    await app.close();
    expect(res.statusCode).toBe(400);
  });

  it("broadstreet test-connection returns 400 on missing fields", async () => {
    const app = await createRouteApp(broadstreetRoute);
    const res = await app.inject({
      method: "POST",
      url: "/api/tenant/tenant-1/adapters/broadstreet/test-connection",
      payload: {},
    });
    await app.close();
    expect(res.statusCode).toBe(400);
  });

  it("broadstreet zones returns configured error payload when adapter missing", async () => {
    selectRowsQueue.push([]);
    const app = await createRouteApp(broadstreetRoute);
    const res = await app.inject({ method: "GET", url: "/api/tenant/tenant-1/adapters/broadstreet/zones" });
    await app.close();
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ zones: [], error: "Broadstreet not configured" });
  });

  it("mockConnectionConfig GET returns 401 when unauthenticated", async () => {
    sessionState = {};
    const app = await createRouteApp(mockConnectionConfigRoute);
    const res = await app.inject({ method: "GET", url: "/adapters/mock/connection_config/tenant-1" });
    await app.close();
    expect(res.statusCode).toBe(401);
  });

  it("mockConfig POST returns 404 when product does not exist", async () => {
    selectRowsQueue.push([]);
    const app = await createRouteApp(mockConfigRoute);
    const res = await app.inject({
      method: "POST",
      url: "/tenant/tenant-1/adapters/mock/config/product-1",
      payload: {},
    });
    await app.close();
    expect(res.statusCode).toBe(404);
  });

  it("detect-network returns 400 when refresh_token is missing", async () => {
    const app = await createRouteApp(detectConfigureRoute);
    const res = await app.inject({ method: "POST", url: "/tenant/tenant-1/gam/detect-network", payload: {} });
    await app.close();
    expect(res.statusCode).toBe(400);
  });

  it("configure returns 400 when network_code is missing", async () => {
    const app = await createRouteApp(detectConfigureRoute);
    const res = await app.inject({ method: "POST", url: "/tenant/tenant-1/gam/configure", payload: {} });
    await app.close();
    expect(res.statusCode).toBe(400);
  });

  it("service-account create returns 500 when GCP_PROJECT_ID is unset", async () => {
    const app = await createRouteApp(serviceAccountRoute);
    const res = await app.inject({ method: "POST", url: "/tenant/tenant-1/gam/create-service-account" });
    await app.close();
    expect(res.statusCode).toBe(500);
  });

  it("service-account email returns null when not configured", async () => {
    selectRowsQueue.push([]);
    const app = await createRouteApp(serviceAccountRoute);
    const res = await app.inject({ method: "GET", url: "/tenant/tenant-1/gam/get-service-account-email" });
    await app.close();
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ service_account_email: null });
  });

  it("sync-status by id returns 404 when sync job is absent", async () => {
    selectRowsQueue.push([]);
    const app = await createRouteApp(syncStatusRoute);
    const res = await app.inject({ method: "GET", url: "/tenant/tenant-1/gam/sync-status/sync-1" });
    await app.close();
    expect(res.statusCode).toBe(404);
  });

  it("sync-status latest returns 404 when no running sync exists", async () => {
    selectRowsQueue.push([]);
    const app = await createRouteApp(syncStatusRoute);
    const res = await app.inject({ method: "GET", url: "/tenant/tenant-1/gam/sync-status/latest" });
    await app.close();
    expect(res.statusCode).toBe(404);
  });

  it("reset-stuck-sync returns 403 for viewer role", async () => {
    sessionState = { user: "viewer@example.com", role: "viewer", tenant_id: "tenant-1" };
    const app = await createRouteApp(syncStatusRoute);
    const res = await app.inject({ method: "POST", url: "/tenant/tenant-1/gam/reset-stuck-sync" });
    await app.close();
    expect(res.statusCode).toBe(403);
  });

  it("line-item view returns 404 when tenant is missing", async () => {
    selectRowsQueue.push([]);
    const app = await createRouteApp(lineItemRoute);
    const res = await app.inject({ method: "GET", url: "/tenant/tenant-1/gam/line-item/123" });
    await app.close();
    expect(res.statusCode).toBe(404);
  });

  it("customTargeting returns 400 when GAM is not connected", async () => {
    selectRowsQueue.push([{ tenantId: "tenant-1" }], [{ gamNetworkCode: null, gamRefreshToken: null }]);
    const app = await createRouteApp(customTargetingRoute);
    const res = await app.inject({ method: "GET", url: "/tenant/tenant-1/gam/api/custom-targeting-keys" });
    await app.close();
    expect(res.statusCode).toBe(400);
  });

  it("products API list returns 401 when unauthenticated", async () => {
    sessionState = {};
    const app = await createRouteApp(productsListApiRoute);
    const res = await app.inject({ method: "GET", url: "/api/tenant/tenant-1/products" });
    await app.close();
    expect(res.statusCode).toBe(401);
  });

  it("products suggestions returns 401 when unauthenticated", async () => {
    sessionState = {};
    const app = await createRouteApp(productsListApiRoute);
    const res = await app.inject({ method: "GET", url: "/api/tenant/tenant-1/products/suggestions" });
    await app.close();
    expect(res.statusCode).toBe(401);
  });

  it("revenue chart returns 401 when unauthenticated", async () => {
    sessionState = {};
    const app = await createRouteApp(revenueChartRoute);
    const res = await app.inject({ method: "GET", url: "/api/tenant/tenant-1/revenue-chart" });
    await app.close();
    expect(res.statusCode).toBe(401);
  });

  it("gam advertisers returns 400 when tenant_id cannot be resolved", async () => {
    sessionState = { user: "admin@example.com" };
    const app = await createRouteApp(gamAdvertisersRoute);
    const res = await app.inject({ method: "POST", url: "/api/gam/get-advertisers", payload: {} });
    await app.close();
    expect(res.statusCode).toBe(400);
  });

  it("gam test-connection returns 400 when refresh_token is missing", async () => {
    const app = await createRouteApp(gamAdvertisersRoute);
    const res = await app.inject({ method: "POST", url: "/api/gam/test-connection", payload: {} });
    await app.close();
    expect(res.statusCode).toBe(400);
  });
});
