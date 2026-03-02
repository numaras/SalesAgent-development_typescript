/**
 * Unit tests for deliveryQueryService.
 *
 * DB is mocked; filter by status and date range clamp are tested.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/client.js", () => ({
  db: {
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
  },
}));

import { db } from "../db/client.js";
import { GetMediaBuyDeliveryResponseSchema } from "../schemas/mediaBuyDelivery.js";
import { getMediaBuyDelivery } from "./deliveryQueryService.js";

const ctx = { tenantId: "t1", principalId: "pr1" };

function mockSelectChain(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(rows),
  };
}

describe("getMediaBuyDelivery", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns error and empty deliveries when start_date >= end_date", async () => {
    const result = await getMediaBuyDelivery(ctx, {
      start_date: "2026-06-01",
      end_date: "2026-05-01",
    });
    expect(GetMediaBuyDeliveryResponseSchema.safeParse(result).success).toBe(
      true,
    );
    expect(result.media_buy_deliveries).toHaveLength(0);
    expect(result.errors).toContainEqual({
      code: "invalid_date_range",
      message: "Start date must be before end date",
    });
  });

  it("clamps date range and returns valid response when start < end", async () => {
    vi.mocked(db).select = vi.fn().mockReturnValue(mockSelectChain([]));
    const result = await getMediaBuyDelivery(ctx, {
      start_date: "2026-01-01",
      end_date: "2026-01-31",
    });
    expect(GetMediaBuyDeliveryResponseSchema.safeParse(result).success).toBe(
      true,
    );
    expect(result.reporting_period.start).toContain("2026-01-01");
    expect(result.reporting_period.end).toContain("2026-01-31");
    expect(result.media_buy_deliveries).toHaveLength(0);
    expect(result.aggregated_totals.impressions).toBe(0);
    expect(result.aggregated_totals.spend).toBe(0);
  });

  it("filters by status_filter and only includes matching status", async () => {
    const now = new Date("2026-07-15T12:00:00.000Z");
    vi.useFakeTimers({ now });
    const completedBuy = {
      mediaBuyId: "mb_1",
      tenantId: ctx.tenantId,
      principalId: ctx.principalId,
      buyerRef: "ref1",
      orderName: "Order",
      advertiserName: "Advertiser",
      startDate: "2026-01-01",
      endDate: "2026-06-30",
      startTime: null,
      endTime: null,
      status: "draft",
      rawRequest: {},
    };
    vi.mocked(db).select = vi.fn().mockReturnValue(mockSelectChain([completedBuy]));
    const result = await getMediaBuyDelivery(ctx, {
      start_date: "2026-07-01",
      end_date: "2026-07-31",
      status_filter: "completed",
    });
    vi.useRealTimers();
    expect(result.media_buy_deliveries).toHaveLength(1);
    expect(result.media_buy_deliveries[0].status).toBe("completed");
    expect(result.media_buy_deliveries[0].media_buy_id).toBe("mb_1");
  });
});
