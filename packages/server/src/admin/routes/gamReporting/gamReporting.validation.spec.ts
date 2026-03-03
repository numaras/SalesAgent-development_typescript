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

const mockGetBaseReportingRows = vi.fn(async () => []);
const mockGetCountryBreakdown = vi.fn(async () => []);
const mockGetAdUnitBreakdown = vi.fn(async () => []);
const mockGetAdvertiserSummary = vi.fn(async () => ({
  advertiser_id: "123",
  total_impressions: 0,
  total_spend: 0,
  avg_cpm: 0,
}));
vi.mock("../../services/gamReportingService.js", () => ({
  getBaseReportingRows: (...args: unknown[]) => mockGetBaseReportingRows(...args),
  getCountryBreakdown: (...args: unknown[]) => mockGetCountryBreakdown(...args),
  getAdUnitBreakdown: (...args: unknown[]) => mockGetAdUnitBreakdown(...args),
  getAdvertiserSummary: (...args: unknown[]) => mockGetAdvertiserSummary(...args),
}));
const mockFetchLiveGamBaseReportingRows = vi.fn(async () => []);
const mockFetchLiveGamCountryBreakdown = vi.fn(async () => []);
const mockFetchLiveGamAdUnitBreakdown = vi.fn(async () => []);
const mockFetchLiveGamAdvertiserSummary = vi.fn(async () => ({
  advertiser_id: "123",
  total_impressions: 0,
  total_spend: 0,
  avg_cpm: 0,
}));
vi.mock("../../../services/gamLiveReportingService.js", () => ({
  fetchLiveGamBaseReportingRows: (...args: unknown[]) =>
    mockFetchLiveGamBaseReportingRows(...args),
  fetchLiveGamCountryBreakdown: (...args: unknown[]) =>
    mockFetchLiveGamCountryBreakdown(...args),
  fetchLiveGamAdUnitBreakdown: (...args: unknown[]) =>
    mockFetchLiveGamAdUnitBreakdown(...args),
  fetchLiveGamAdvertiserSummary: (...args: unknown[]) =>
    mockFetchLiveGamAdvertiserSummary(...args),
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

    it("GET /api/tenant/:id/gam/reporting falls back to DB rows when live GAM fetch fails", async () => {
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
      mockGetBaseReportingRows.mockResolvedValueOnce([
        {
          timestamp: "2026-03-01T00:00:00.000Z",
          impressions: 100,
          spend: 2.5,
          clicks: 3,
          advertiser_id: "111",
          advertiser_name: "Acme",
          order_id: "222",
          order_name: "Order A",
          line_item_id: "333",
          line_item_name: "Line 1",
        },
      ]);
      mockFetchLiveGamBaseReportingRows.mockRejectedValueOnce(
        new Error("live GAM unavailable"),
      );

      const app = await createAdminApp(baseRoute);
      const res = await app.inject({
        method: "GET",
        url: "/api/tenant/tenant-1/gam/reporting?date_range=today",
      });
      await app.close();

      expect(res.statusCode).toBe(200);
      expect(mockGetBaseReportingRows).toHaveBeenCalledTimes(1);
      expect(mockFetchLiveGamBaseReportingRows).toHaveBeenCalledTimes(1);
      expect(res.json()).toMatchObject({
        success: true,
        data: [
          {
            advertiser_id: "111",
            advertiser_name: "Acme",
            order_id: "222",
            line_item_id: "333",
            impressions: 100,
            clicks: 3,
            spend: 2.5,
          },
        ],
        metadata: {
          query_type: "db_cached_gam_line_items",
        },
      });
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

    it("GET /api/tenant/:id/gam/reporting/countries falls back to DB breakdown when live fetch fails", async () => {
      mockLimit
        .mockResolvedValueOnce([{ tenantId: "tenant-1", adServer: "google_ad_manager" }])
        .mockResolvedValueOnce([
          {
            tenantId: "tenant-1",
            gamRefreshToken: "refresh-token",
            gamServiceAccountJson: null,
          },
        ]);
      mockGetCountryBreakdown.mockResolvedValueOnce([
        { country: "United States", impressions: 100, spend: 1, avg_cpm: 10, ctr: 1 },
      ]);
      mockFetchLiveGamCountryBreakdown.mockRejectedValueOnce(new Error("live down"));

      const app = await createAdminApp(breakdownRoute);
      const res = await app.inject({
        method: "GET",
        url: "/api/tenant/tenant-1/gam/reporting/countries?date_range=today",
      });
      await app.close();

      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({
        success: true,
        data: [{ country: "United States", impressions: 100 }],
      });
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

    it("GET /api/tenant/:id/principals/:p_id/gam/reporting falls back to DB rows when live GAM fetch fails", async () => {
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
            gamNetworkTimezone: "America/New_York",
          },
        ]);
      mockGetBaseReportingRows.mockResolvedValueOnce([
        {
          timestamp: "2026-03-01T00:00:00.000Z",
          impressions: 88,
          spend: 1.2,
          clicks: 2,
          advertiser_id: "123",
          advertiser_name: "Acme",
          order_id: "o1",
          order_name: "Order 1",
          line_item_id: "l1",
          line_item_name: "Line 1",
        },
      ]);
      mockFetchLiveGamBaseReportingRows.mockRejectedValueOnce(new Error("live unavailable"));

      const app = await createAdminApp(principalRoute);
      const res = await app.inject({
        method: "GET",
        url: "/api/tenant/tenant-1/principals/p-1/gam/reporting?date_range=today",
      });
      await app.close();

      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({
        success: true,
        data: [{ impressions: 88, advertiser_id: "123" }],
        metadata: { query_type: "db_cached_gam_line_items" },
      });
    });
  });
});
