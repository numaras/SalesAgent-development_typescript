import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDbLimit = vi.fn<() => Promise<unknown[]>>();
const mockDbWhere = vi.fn(() => ({ limit: mockDbLimit }));
const mockDbFrom = vi.fn(() => ({ where: mockDbWhere }));
const mockDbSelect = vi.fn(() => ({ from: mockDbFrom }));

vi.mock("../db/client.js", () => ({
  db: {
    select: (...args: unknown[]) => mockDbSelect(...args),
  },
}));

const mockGetService = vi.fn();
const mockBuildGamClient = vi.fn(() => ({ getService: mockGetService }));
vi.mock("../gam/gamClient.js", () => ({
  buildGamClient: (...args: unknown[]) => mockBuildGamClient(...args),
}));

import {
  fetchLiveGamAdUnitBreakdown,
  fetchLiveGamAdvertiserSummary,
  fetchLiveGamBaseReportingRows,
  fetchLiveGamCountryBreakdown,
} from "./gamLiveReportingService.js";

function makeReportService(overrides?: Partial<Record<string, unknown>>) {
  return {
    runReportJob: vi.fn().mockResolvedValue({ id: 123 }),
    getReportJobStatus: vi.fn().mockResolvedValue("COMPLETED"),
    getReportDownloadUrlWithOptions: vi
      .fn()
      .mockResolvedValue("https://reports.example.test/report.csv"),
    ...overrides,
  };
}

describe("fetchLiveGamBaseReportingRows", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useRealTimers();
    mockDbLimit.mockResolvedValue([
      { tenantId: "tenant-1", gamNetworkCode: "123456", gamRefreshToken: "token" },
    ]);
  });

  it("parses CSV report rows into base reporting shape", async () => {
    const reportService = makeReportService();
    mockGetService.mockResolvedValue(reportService);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          [
            "Dimension.DATE,Dimension.HOUR,Dimension.ADVERTISER_ID,Dimension.ADVERTISER_NAME,Dimension.ORDER_ID,Dimension.ORDER_NAME,Dimension.LINE_ITEM_ID,Dimension.LINE_ITEM_NAME,Column.AD_SERVER_IMPRESSIONS,Column.AD_SERVER_CLICKS,Column.AD_SERVER_ALL_REVENUE",
            "2026-03-01,13,111,Acme,222,Order A,333,Line 1,1000,10,2500000",
          ].join("\n"),
      }),
    );

    const rows = await fetchLiveGamBaseReportingRows({
      tenantId: "tenant-1",
      dateRange: "today",
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      timestamp: "2026-03-01T13:00:00.000Z",
      impressions: 1000,
      clicks: 10,
      spend: 2.5,
      advertiser_id: "111",
      advertiser_name: "Acme",
      order_id: "222",
      order_name: "Order A",
      line_item_id: "333",
      line_item_name: "Line 1",
    });
  });

  it("polls until report job is completed", async () => {
    vi.useFakeTimers();
    const reportService = makeReportService({
      getReportJobStatus: vi
        .fn()
        .mockResolvedValueOnce("IN_PROGRESS")
        .mockResolvedValueOnce("COMPLETED"),
    });
    mockGetService.mockResolvedValue(reportService);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          [
            "Dimension.DATE,Dimension.ADVERTISER_ID,Dimension.ADVERTISER_NAME,Dimension.ORDER_ID,Dimension.ORDER_NAME,Dimension.LINE_ITEM_ID,Dimension.LINE_ITEM_NAME,Column.AD_SERVER_IMPRESSIONS,Column.AD_SERVER_CLICKS,Column.AD_SERVER_ALL_REVENUE",
            "2026-03-01,111,Acme,222,Order A,333,Line 1,1000,10,2500000",
          ].join("\n"),
      }),
    );

    const promise = fetchLiveGamBaseReportingRows({
      tenantId: "tenant-1",
      dateRange: "this_month",
      advertiserId: "111",
    });

    await vi.advanceTimersByTimeAsync(2000);
    const rows = await promise;

    expect(rows).toHaveLength(1);
    expect(reportService.getReportJobStatus).toHaveBeenCalledTimes(2);
  });

  it("throws when GAM report job fails", async () => {
    const reportService = makeReportService({
      getReportJobStatus: vi.fn().mockResolvedValue("FAILED"),
    });
    mockGetService.mockResolvedValue(reportService);
    vi.stubGlobal("fetch", vi.fn());

    await expect(
      fetchLiveGamBaseReportingRows({
        tenantId: "tenant-1",
        dateRange: "today",
      }),
    ).rejects.toThrow("failed");
  });

  it("throws when adapter config is missing", async () => {
    mockDbLimit.mockResolvedValueOnce([]);
    vi.stubGlobal("fetch", vi.fn());

    await expect(
      fetchLiveGamBaseReportingRows({
        tenantId: "tenant-1",
        dateRange: "today",
      }),
    ).rejects.toThrow("Adapter config not found");
  });

  it("aggregates country breakdown rows from live report", async () => {
    const reportService = makeReportService();
    mockGetService.mockResolvedValue(reportService);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          [
            "Dimension.COUNTRY_NAME,Column.AD_SERVER_IMPRESSIONS,Column.AD_SERVER_CLICKS,Column.AD_SERVER_ALL_REVENUE",
            "United States,1000,50,2000000",
            "United States,500,10,1000000",
            "Canada,200,5,400000",
          ].join("\n"),
      }),
    );

    const rows = await fetchLiveGamCountryBreakdown({
      tenantId: "tenant-1",
      dateRange: "today",
    });

    expect(rows).toEqual([
      {
        country: "United States",
        impressions: 1500,
        spend: 3,
        avg_cpm: 2,
        ctr: 4,
      },
      {
        country: "Canada",
        impressions: 200,
        spend: 0.4,
        avg_cpm: 2,
        ctr: 2.5,
      },
    ]);
  });

  it("aggregates ad-unit breakdown rows from live report", async () => {
    const reportService = makeReportService();
    mockGetService.mockResolvedValue(reportService);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          [
            "Dimension.AD_UNIT_ID,Dimension.AD_UNIT_NAME,Column.AD_SERVER_IMPRESSIONS,Column.AD_SERVER_CLICKS,Column.AD_SERVER_ALL_REVENUE",
            "10,Homepage Top,1000,40,3000000",
            "10,Homepage Top,500,20,1000000",
            "20,Article Sidebar,200,5,800000",
          ].join("\n"),
      }),
    );

    const rows = await fetchLiveGamAdUnitBreakdown({
      tenantId: "tenant-1",
      dateRange: "today",
    });

    expect(rows).toEqual([
      {
        ad_unit_id: "10",
        ad_unit_name: "Homepage Top",
        impressions: 1500,
        spend: 4,
        avg_cpm: 2.666667,
      },
      {
        ad_unit_id: "20",
        ad_unit_name: "Article Sidebar",
        impressions: 200,
        spend: 0.8,
        avg_cpm: 4,
      },
    ]);
  });

  it("computes advertiser summary from live base rows", async () => {
    const reportService = makeReportService();
    mockGetService.mockResolvedValue(reportService);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          [
            "Dimension.DATE,Dimension.ADVERTISER_ID,Dimension.ADVERTISER_NAME,Dimension.ORDER_ID,Dimension.ORDER_NAME,Dimension.LINE_ITEM_ID,Dimension.LINE_ITEM_NAME,Column.AD_SERVER_IMPRESSIONS,Column.AD_SERVER_CLICKS,Column.AD_SERVER_ALL_REVENUE",
            "2026-03-01,111,Acme,222,Order A,333,Line 1,1000,10,2500000",
            "2026-03-01,111,Acme,223,Order B,444,Line 2,500,5,1000000",
          ].join("\n"),
      }),
    );

    const summary = await fetchLiveGamAdvertiserSummary({
      tenantId: "tenant-1",
      advertiserId: "111",
      dateRange: "today",
    });

    expect(summary).toEqual({
      advertiser_id: "111",
      total_impressions: 1500,
      total_spend: 3.5,
      avg_cpm: 2.333333,
    });
  });
});
