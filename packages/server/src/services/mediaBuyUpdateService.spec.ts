/**
 * Unit tests for mediaBuyUpdateService.
 *
 * Lookup and adapter are mocked; no real DB or adapter calls.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./mediaBuyLookup.js", () => ({
  lookupMediaBuy: vi.fn(),
  MediaBuyNotFoundError: class MediaBuyNotFoundError extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = "MediaBuyNotFoundError";
    }
  },
  MediaBuyForbiddenError: class MediaBuyForbiddenError extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = "MediaBuyForbiddenError";
    }
  },
}));
vi.mock("./mediaBuyAdapterCall.js", () => ({
  updateMediaBuyViaAdapter: vi.fn(),
}));

import { lookupMediaBuy } from "./mediaBuyLookup.js";
import { updateMediaBuy } from "./mediaBuyUpdateService.js";
import { updateMediaBuyViaAdapter } from "./mediaBuyAdapterCall.js";
import { stripInternalFields } from "./internalFieldStripper.js";

const ctx = { tenantId: "t1", principalId: "pr1" };

describe("updateMediaBuy", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(lookupMediaBuy).mockResolvedValue({
      mediaBuyId: "mb_1",
      buyerRef: "ref1",
      principalId: ctx.principalId,
      tenantId: ctx.tenantId,
      orderName: "Order",
      advertiserName: "Advertiser",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      status: "draft",
      rawRequest: {},
    } as Awaited<ReturnType<typeof lookupMediaBuy>>);
    vi.mocked(updateMediaBuyViaAdapter).mockResolvedValue({
      media_buy_id: "mb_1",
      affected_packages: [{ package_id: "pkg_1", paused: false }],
    });
  });

  it("resolves by buyer_ref and returns success", async () => {
    const result = await updateMediaBuy(ctx, {
      buyer_ref: "ref1",
      packages: [{ package_id: "pkg_1" }],
    });
    expect("media_buy_id" in result && result.media_buy_id).toBe("mb_1");
    expect(lookupMediaBuy).toHaveBeenCalledWith(ctx, { buyerRef: "ref1" });
    expect(lookupMediaBuy).toHaveBeenCalledWith(ctx, { mediaBuyId: "mb_1" });
    expect(updateMediaBuyViaAdapter).toHaveBeenCalledWith(
      ctx,
      "mb_1",
      expect.any(Object),
    );
  });

  it("paused toggle is passed through to affected_packages", async () => {
    vi.mocked(updateMediaBuyViaAdapter).mockResolvedValue({
      media_buy_id: "mb_1",
      affected_packages: [{ package_id: "pkg_1", paused: true }],
    });
    const result = await updateMediaBuy(ctx, {
      media_buy_id: "mb_1",
      packages: [{ package_id: "pkg_1", paused: true }],
    });
    expect("affected_packages" in result && result.affected_packages).toHaveLength(
      1,
    );
    expect(
      "affected_packages" in result && result.affected_packages?.[0],
    ).toMatchObject({ package_id: "pkg_1", paused: true });
  });

  it("changes_applied is absent after stripInternalFields", () => {
    const raw = {
      media_buy_id: "mb_1",
      affected_packages: [
        {
          package_id: "pkg_1",
          paused: false,
          changes_applied: { budget: true },
        },
      ],
    };
    const stripped = stripInternalFields(raw);
    expect(stripped).toHaveProperty("affected_packages");
    const pkg = (stripped as { affected_packages: unknown[] }).affected_packages[0];
    expect(pkg).not.toHaveProperty("changes_applied");
    expect(pkg).toHaveProperty("package_id", "pkg_1");
  });

  it("throws on parse when neither media_buy_id nor buyer_ref provided", async () => {
    await expect(
      updateMediaBuy(ctx, {
        packages: [{ package_id: "pkg_1" }],
      }),
    ).rejects.toThrow("Either media_buy_id or buyer_ref is required.");
  });
});
