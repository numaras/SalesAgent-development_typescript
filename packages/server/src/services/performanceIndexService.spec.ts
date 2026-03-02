/**
 * Unit tests for performanceIndexService.
 *
 * Tests: data stored; webhook fired when webhook_url provided.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./mediaBuyLookup.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./mediaBuyLookup.js")>();
  return { ...actual, lookupMediaBuy: vi.fn() };
});

import {
  lookupMediaBuy,
  MediaBuyNotFoundError,
} from "./mediaBuyLookup.js";
import {
  getStoredPerformance,
  updatePerformanceIndex,
} from "./performanceIndexService.js";

const ctx = { tenantId: "t1", principalId: "pr1" };

describe("updatePerformanceIndex", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true }),
    );
  });

  it("stores performance_data and returns success when media buy exists", async () => {
    vi.mocked(lookupMediaBuy).mockResolvedValue({
      mediaBuyId: "mb_1",
      tenantId: ctx.tenantId,
      principalId: ctx.principalId,
    } as ReturnType<typeof lookupMediaBuy> extends Promise<infer R> ? R : never);

    const performance_data = [
      { product_id: "p1", performance_index: 1.2 },
      { product_id: "p2", performance_index: 0.9, confidence_score: 0.8 },
    ];
    const result = await updatePerformanceIndex(ctx, {
      media_buy_id: "mb_1",
      performance_data,
    });

    expect(result.status).toBe("success");
    expect(result.detail).toContain("2 products");
    expect(getStoredPerformance("mb_1")).toEqual(performance_data);
  });

  it("returns failed when media buy not found", async () => {
    vi.mocked(lookupMediaBuy).mockRejectedValue(
      new MediaBuyNotFoundError("mb_missing"),
    );

    const result = await updatePerformanceIndex(ctx, {
      media_buy_id: "mb_missing",
      performance_data: [{ product_id: "p1", performance_index: 1.0 }],
    });

    expect(result.status).toBe("failed");
    expect(result.detail).toContain("not found");
    expect(getStoredPerformance("mb_missing")).toBeUndefined();
  });

  it("calls webhook_url with response when provided", async () => {
    vi.mocked(lookupMediaBuy).mockResolvedValue({
      mediaBuyId: "mb_1",
      tenantId: ctx.tenantId,
      principalId: ctx.principalId,
    } as ReturnType<typeof lookupMediaBuy> extends Promise<infer R> ? R : never);

    const webhookUrl = "https://example.com/webhook";
    await updatePerformanceIndex(ctx, {
      media_buy_id: "mb_1",
      performance_data: [{ product_id: "p1", performance_index: 1.0 }],
      webhook_url: webhookUrl,
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      webhookUrl,
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.status).toBe("success");
    expect(body.detail).toBeDefined();
  });
});
