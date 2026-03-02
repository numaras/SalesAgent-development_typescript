import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyPluginAsync } from "fastify";

import { buildApp } from "../../../app.js";
import baseRoute from "./base.js";
import breakdownRoute from "./breakdown.js";
import principalRoute from "./principal.js";

const mockRequireTenantAccess = vi.fn();
vi.mock("../../services/authGuard.js", () => ({
  requireTenantAccess: (...args: unknown[]) => mockRequireTenantAccess(...args),
}));

const mockLimit = vi.fn();
const mockWhere = vi.fn(() => ({ limit: mockLimit }));
const mockFrom = vi.fn(() => ({ where: mockWhere }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));

vi.mock("../../../db/client.js", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}));

async function createAdminApp(routePlugin: FastifyPluginAsync) {
  const app = await buildApp({ logger: false, registerDefaultRoutes: false });
  await app.register(routePlugin);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireTenantAccess.mockResolvedValue(true);
});

describe("Admin GAM reporting validation coverage", () => {
  describe("base route", () => {
    it("GET /api/tenant/:id/gam/reporting returns 400 for invalid tenant id", async () => {
      const app = await createAdminApp(baseRoute);
      const res = await app.inject({
        method: "GET",
        url: "/api/tenant/tenant!bad/gam/reporting?date_range=today",
      });
      await app.close();

      expect(res.statusCode).toBe(400);
      expect(mockRequireTenantAccess).not.toHaveBeenCalled();
    });

    it("GET /api/tenant/:id/gam/reporting returns 400 for invalid query", async () => {
      mockLimit.mockResolvedValueOnce([
        { tenantId: "tenant-1", adServer: "google_ad_manager" },
      ]);

      const app = await createAdminApp(baseRoute);
      const res = await app.inject({
        method: "GET",
        url: "/api/tenant/tenant-1/gam/reporting?date_range=bad",
      });
      await app.close();

      expect(res.statusCode).toBe(400);
    });

    it("GET /api/tenant/:id/gam/reporting returns 200 on valid input", async () => {
      mockLimit
        .mockResolvedValueOnce([{ tenantId: "tenant-1", adServer: "google_ad_manager" }])
        .mockResolvedValueOnce([
          {
            tenantId: "tenant-1",
            gamRefreshToken: "refresh-token",
            gamServiceAccountJson: null,
            gamNetworkTimezone: "America/New_York",
          },
        ]);

      const app = await createAdminApp(baseRoute);
      const res = await app.inject({
        method: "GET",
        url: "/api/tenant/tenant-1/gam/reporting?date_range=today",
      });
      await app.close();

      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ success: true });
    });
  });

  describe("breakdown routes", () => {
    it("GET /api/tenant/:id/gam/reporting/countries returns 400 for invalid advertiser_id", async () => {
      mockLimit
        .mockResolvedValueOnce([{ tenantId: "tenant-1", adServer: "google_ad_manager" }])
        .mockResolvedValueOnce([{ tenantId: "tenant-1" }]);

      const app = await createAdminApp(breakdownRoute);
      const res = await app.inject({
        method: "GET",
        url: "/api/tenant/tenant-1/gam/reporting/countries?date_range=today&advertiser_id=abc",
      });
      await app.close();

      expect(res.statusCode).toBe(400);
    });

    it("GET /api/tenant/:id/gam/reporting/ad-units returns 200 on valid input", async () => {
      mockLimit
        .mockResolvedValueOnce([{ tenantId: "tenant-1", adServer: "google_ad_manager" }])
        .mockResolvedValueOnce([
          {
            tenantId: "tenant-1",
            gamRefreshToken: "refresh-token",
            gamServiceAccountJson: null,
          },
        ]);

      const app = await createAdminApp(breakdownRoute);
      const res = await app.inject({
        method: "GET",
        url: "/api/tenant/tenant-1/gam/reporting/ad-units?date_range=today",
      });
      await app.close();

      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ success: true, data: [] });
    });

    it("GET /api/tenant/:id/gam/reporting/advertiser/:adv_id/summary returns 400 for invalid adv_id", async () => {
      mockLimit
        .mockResolvedValueOnce([{ tenantId: "tenant-1", adServer: "google_ad_manager" }])
        .mockResolvedValueOnce([{ tenantId: "tenant-1" }]);

      const app = await createAdminApp(breakdownRoute);
      const res = await app.inject({
        method: "GET",
        url: "/api/tenant/tenant-1/gam/reporting/advertiser/abc/summary?date_range=today",
      });
      await app.close();

      expect(res.statusCode).toBe(400);
    });
  });

  describe("principal routes", () => {
    it("GET /api/tenant/:id/principals/:p_id/gam/reporting returns 400 for invalid principal id", async () => {
      const app = await createAdminApp(principalRoute);
      const res = await app.inject({
        method: "GET",
        url: "/api/tenant/tenant-1/principals/invalid!id/gam/reporting?date_range=today",
      });
      await app.close();

      expect(res.statusCode).toBe(400);
    });

    it("GET /api/tenant/:id/principals/:p_id/gam/reporting returns 404 when principal is missing", async () => {
      mockLimit.mockResolvedValueOnce([]);

      const app = await createAdminApp(principalRoute);
      const res = await app.inject({
        method: "GET",
        url: "/api/tenant/tenant-1/principals/p-1/gam/reporting?date_range=today",
      });
      await app.close();

      expect(res.statusCode).toBe(404);
    });

    it("GET /api/tenant/:id/principals/:p_id/gam/reporting/summary returns 200 on valid input", async () => {
      mockLimit
        .mockResolvedValueOnce([
          {
            tenantId: "tenant-1",
            principalId: "p-1",
            platformMappings: { google_ad_manager: { advertiser_id: "123" } },
          },
        ])
        .mockResolvedValueOnce([
          {
            tenantId: "tenant-1",
            gamRefreshToken: "refresh-token",
            gamServiceAccountJson: null,
          },
        ]);

      const app = await createAdminApp(principalRoute);
      const res = await app.inject({
        method: "GET",
        url: "/api/tenant/tenant-1/principals/p-1/gam/reporting/summary?date_range=today",
      });
      await app.close();

      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ success: true });
    });
  });
});