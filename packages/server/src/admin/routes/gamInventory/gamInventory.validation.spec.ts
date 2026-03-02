import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyPluginAsync } from "fastify";

import { buildApp } from "../../../app.js";
import syncTreeRoute from "./syncTree.js";
import productInventoryRoute from "./productInventory.js";
import targetingRoute from "./targeting.js";

const mockRequireTenantAccess = vi.fn();
vi.mock("../../services/authGuard.js", () => ({
  requireTenantAccess: (...args: unknown[]) => mockRequireTenantAccess(...args),
}));

const selectLimitQueue: unknown[][] = [];
const mockLimit = vi.fn(() => Promise.resolve(selectLimitQueue.shift() ?? []));
const mockWhere = vi.fn(() => ({ limit: mockLimit }));
const mockFrom = vi.fn(() => ({ where: mockWhere }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));

const mockInsertValues = vi.fn(() => Promise.resolve());
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

vi.mock("../../../db/client.js", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}));

async function createAdminApp(routePlugin: FastifyPluginAsync) {
  const app = await buildApp({ logger: false, registerDefaultRoutes: false });
  await app.register(routePlugin);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  selectLimitQueue.length = 0;
  mockRequireTenantAccess.mockResolvedValue(true);
});

describe("Admin GAM inventory validation coverage", () => {
  describe("sync endpoints", () => {
    it("POST /api/tenant/:id/inventory/sync returns 404 when tenant missing", async () => {
      selectLimitQueue.push([]);

      const app = await createAdminApp(syncTreeRoute);
      const res = await app.inject({ method: "POST", url: "/api/tenant/tenant-1/inventory/sync" });
      await app.close();

      expect(res.statusCode).toBe(404);
      expect(res.json()).toMatchObject({ error: "Tenant not found" });
    });

    it("POST /api/tenant/:id/inventory/sync returns 400 for non-GAM tenant", async () => {
      selectLimitQueue.push([{ tenantId: "tenant-1", adServer: "mock" }]);

      const app = await createAdminApp(syncTreeRoute);
      const res = await app.inject({ method: "POST", url: "/api/tenant/tenant-1/inventory/sync" });
      await app.close();

      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({ error: expect.stringContaining("only available") });
    });

    it("POST /api/tenant/:id/inventory/sync returns 202 on valid request", async () => {
      selectLimitQueue.push(
        [{ tenantId: "tenant-1", adServer: "google_ad_manager" }],
        [{ tenantId: "tenant-1", adapterType: "google_ad_manager", gamNetworkCode: "123" }],
        [],
      );

      const app = await createAdminApp(syncTreeRoute);
      const res = await app.inject({ method: "POST", url: "/api/tenant/tenant-1/inventory/sync" });
      await app.close();

      expect(res.statusCode).toBe(202);
      expect(mockInsertValues).toHaveBeenCalledOnce();
    });
  });

  describe("product inventory assignment", () => {
    it("POST /api/tenant/:id/product/:p_id/inventory returns 400 for invalid body", async () => {
      const app = await createAdminApp(productInventoryRoute);
      const res = await app.inject({
        method: "POST",
        url: "/api/tenant/tenant-1/product/p-1/inventory",
        payload: { inventory_id: "", inventory_type: "" },
      });
      await app.close();

      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({
        error: "inventory_id and inventory_type are required",
      });
    });
  });

  describe("targeting values endpoint", () => {
    it("GET /api/tenant/:id/targeting/values/:key_id returns 404 when key is missing", async () => {
      selectLimitQueue.push(
        [{ tenantId: "tenant-1" }],
        [],
      );

      const app = await createAdminApp(targetingRoute);
      const res = await app.inject({
        method: "GET",
        url: "/api/tenant/tenant-1/targeting/values/key-1",
      });
      await app.close();

      expect(res.statusCode).toBe(404);
      expect(res.json()).toMatchObject({ error: "Custom targeting key not found" });
    });

    it("GET /api/tenant/:id/targeting/values/:key_id returns 400 when adapter missing", async () => {
      selectLimitQueue.push(
        [{ tenantId: "tenant-1" }],
        [{ inventoryId: "key-1", inventoryType: "custom_targeting_key" }],
        [],
      );

      const app = await createAdminApp(targetingRoute);
      const res = await app.inject({
        method: "GET",
        url: "/api/tenant/tenant-1/targeting/values/key-1",
      });
      await app.close();

      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({ error: "No adapter configured for this tenant" });
    });

    it("GET /api/tenant/:id/targeting/values/:key_id returns 200 on valid request", async () => {
      selectLimitQueue.push(
        [{ tenantId: "tenant-1" }],
        [{ inventoryId: "key-1", inventoryType: "custom_targeting_key" }],
        [{ gamNetworkCode: "123", gamRefreshToken: "refresh", gamServiceAccountJson: null }],
      );

      const app = await createAdminApp(targetingRoute);
      const res = await app.inject({
        method: "GET",
        url: "/api/tenant/tenant-1/targeting/values/key-1",
      });
      await app.close();

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ values: [], count: 0 });
    });
  });
});