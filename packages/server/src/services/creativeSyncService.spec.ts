/**
 * Unit tests for creativeSyncService.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./creativeSyncAdapterCall.js", () => ({
  syncCreativesViaAdapter: vi.fn(),
}));

import { SyncCreativesSuccessSchema } from "../schemas/syncCreatives.js";
import { syncCreativesViaAdapter } from "./creativeSyncAdapterCall.js";
import { syncCreatives } from "./creativeSyncService.js";

const ctx = { tenantId: "t", principalId: "p" };

const validCreative = {
  creative_id: "c1",
  name: "Banner",
  format_id: { agent_url: "https://creative.example.org", id: "display_300x250" },
};

describe("syncCreatives", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(syncCreativesViaAdapter).mockResolvedValue({
      creatives: [],
      dry_run: false,
    });
  });

  it("returns dry_run success with created action per creative", async () => {
    const result = await syncCreatives(ctx, {
      creatives: [validCreative],
      dry_run: true,
    });

    expect("creatives" in result).toBe(true);
    expect("errors" in result && result.errors).toBeFalsy();
    const success = result as { creatives: { creative_id: string; action: string }[]; dry_run?: boolean };
    expect(success.creatives).toHaveLength(1);
    expect(success.creatives[0]).toMatchObject({ creative_id: "c1", action: "created" });
    expect(success.dry_run).toBe(true);
    expect(SyncCreativesSuccessSchema.safeParse(result).success).toBe(true);
  });

  it("adds failed result when creative missing name in strict mode", async () => {
    const result = await syncCreatives(ctx, {
      creatives: [
        { ...validCreative, name: "" },
        { ...validCreative, creative_id: "c2", name: "OK" },
      ],
      dry_run: true,
      validation_mode: "strict",
    });

    const success = result as { creatives: { creative_id: string; action: string; errors?: string[] }[] };
    expect(success.creatives).toHaveLength(2);
    const failed = success.creatives.find((c) => c.creative_id === "c1");
    const created = success.creatives.find((c) => c.creative_id === "c2");
    expect(failed?.action).toBe("failed");
    expect(failed?.errors).toContain("name is required in strict mode");
    expect(created?.action).toBe("created");
  });

  it("filters by creative_ids when provided", async () => {
    const result = await syncCreatives(ctx, {
      creatives: [
        validCreative,
        { ...validCreative, creative_id: "c2", name: "Second" },
      ],
      creative_ids: ["c1"],
      dry_run: true,
    });

    const success = result as { creatives: { creative_id: string }[] };
    expect(success.creatives).toHaveLength(1);
    expect(success.creatives[0].creative_id).toBe("c1");
  });

  it("non-dry_run returns merged failed and adapter results", async () => {
    vi.mocked(syncCreativesViaAdapter).mockResolvedValue({
      creatives: [
        { creative_id: "c1", action: "created" },
        { creative_id: "c2", action: "created" },
      ],
      dry_run: false,
    });

    const result = await syncCreatives(ctx, {
      creatives: [
        validCreative,
        { creative_id: "c2", format_id: { agent_url: "https://x.org", id: "v1" } },
      ],
      validation_mode: "lenient",
    });

    const success = result as { creatives: { creative_id: string; action: string }[] };
    expect(success.creatives.length).toBeGreaterThanOrEqual(2);
    const created = success.creatives.filter((c) => c.action === "created");
    expect(created.length).toBe(2);
  });

  // --- Missing parity tests (ADCP-009-E) ---

  it("throws when principal is missing (auth required)", async () => {
    await expect(
      syncCreatives({ tenantId: "t", principalId: "" }, {
        creatives: [validCreative],
        dry_run: true,
      }),
    ).rejects.toThrow("Authentication required");
  });

  it("passes delete_missing flag to adapter and returns deleted actions", async () => {
    vi.mocked(syncCreativesViaAdapter).mockResolvedValue({
      creatives: [
        { creative_id: "c1", action: "created" },
        { creative_id: "stale", action: "deleted" },
      ],
      dry_run: false,
    });

    const result = await syncCreatives(ctx, {
      creatives: [validCreative],
      delete_missing: true,
    });

    expect(vi.mocked(syncCreativesViaAdapter)).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({ delete_missing: true }),
    );
    const success = result as { creatives: { creative_id: string; action: string }[] };
    const deleted = success.creatives.filter((c) => c.action === "deleted");
    expect(deleted).toHaveLength(1);
    expect(deleted[0].creative_id).toBe("stale");
  });

  it("preserves assigned_to field in adapter results (assignment reporting)", async () => {
    vi.mocked(syncCreativesViaAdapter).mockResolvedValue({
      creatives: [
        {
          creative_id: "c1",
          action: "created",
          assigned_to: ["pkg_abc", "pkg_def"],
        },
      ],
      dry_run: false,
    });

    const result = await syncCreatives(ctx, {
      creatives: [validCreative],
    });

    const success = result as {
      creatives: { creative_id: string; action: string; assigned_to?: string[] }[];
    };
    expect(success.creatives[0].assigned_to).toEqual(["pkg_abc", "pkg_def"]);
    expect(SyncCreativesSuccessSchema.safeParse(result).success).toBe(true);
  });
});
