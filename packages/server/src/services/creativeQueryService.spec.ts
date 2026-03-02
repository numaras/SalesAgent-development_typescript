/**
 * Unit tests for creativeQueryService.
 *
 * DB is mocked via vi.mock so no real PostgreSQL connection is needed.
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
import { queryCreatives } from "./creativeQueryService.js";

/** Chain for creative query: .from().where().orderBy() -> rows */
function mockCreativeRowsChain(rows: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue(rows),
  };
  return chain;
}

describe("queryCreatives", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns empty creatives and zero totalCount when none match", async () => {
    vi.mocked(db).select = vi.fn().mockReturnValue(mockCreativeRowsChain([]));

    const result = await queryCreatives(
      { tenantId: "t", principalId: "p" },
      {},
    );

    expect(result.creatives).toEqual([]);
    expect(result.totalCount).toBe(0);
  });

  it("returns creatives in AdCP shape with format_id and dates", async () => {
    const row = {
      creativeId: "c1",
      tenantId: "t",
      principalId: "p",
      name: "Banner",
      agentUrl: "https://creative.example.org",
      format: "display_300x250",
      status: "approved",
      data: { assets: { main: "url" }, url: "https://example.com/img.jpg" },
      formatParameters: null,
      groupId: null,
      createdAt: new Date("2025-01-15T10:00:00Z"),
      updatedAt: new Date("2025-01-16T12:00:00Z"),
      approvedAt: null,
      approvedBy: null,
      strategyId: null,
    };
    vi.mocked(db).select = vi.fn().mockReturnValue(mockCreativeRowsChain([row]));

    const result = await queryCreatives(
      { tenantId: "t", principalId: "p" },
      {},
    );

    expect(result.totalCount).toBe(1);
    expect(result.creatives).toHaveLength(1);
    expect(result.creatives[0]).toMatchObject({
      creative_id: "c1",
      name: "Banner",
      format_id: { agent_url: "https://creative.example.org", id: "display_300x250" },
      status: "approved",
      assets: { main: "url" },
      media_url: "https://example.com/img.jpg",
    });
    expect(result.creatives[0].created_date).toBe("2025-01-15T10:00:00.000Z");
    expect(result.creatives[0].updated_date).toBe("2025-01-16T12:00:00.000Z");
  });

  it("maps pending status to pending_review", async () => {
    const row = {
      creativeId: "c2",
      tenantId: "t",
      principalId: "p",
      name: "Draft",
      agentUrl: "https://creative.example.org",
      format: "display_728x90",
      status: "pending",
      data: { assets: { main: "https://example.com/draft.jpg" } },
      formatParameters: null,
      groupId: null,
      createdAt: new Date(),
      updatedAt: null,
      approvedAt: null,
      approvedBy: null,
      strategyId: null,
    };
    vi.mocked(db).select = vi.fn().mockReturnValue(mockCreativeRowsChain([row]));

    const result = await queryCreatives(
      { tenantId: "t", principalId: "p" },
      {},
    );

    expect(result.creatives[0].status).toBe("pending_review");
  });

  it("applies media_buy_id, buyer_ref, tags, and search filters", async () => {
    const rows = [
      {
        creativeId: "c-match",
        tenantId: "t",
        principalId: "p",
        name: "Sports Video Hero",
        agentUrl: "https://creative.example.org",
        format: "video_16:9_1920x1080",
        status: "approved",
        data: {
          assets: { main: "https://example.com/sports.mp4" },
          tags: ["sports", "premium"],
          description: "High impact sports creative",
          assignments: [{ media_buy_id: "mb_1", buyer_ref: "buyer_a" }],
        },
        formatParameters: null,
        groupId: null,
        createdAt: new Date("2025-01-15T10:00:00Z"),
        updatedAt: new Date("2025-01-16T12:00:00Z"),
        approvedAt: null,
        approvedBy: null,
        strategyId: null,
      },
      {
        creativeId: "c-other",
        tenantId: "t",
        principalId: "p",
        name: "Display Generic",
        agentUrl: "https://creative.example.org",
        format: "display_300x250",
        status: "approved",
        data: {
          assets: { main: "https://example.com/generic.jpg" },
          tags: ["general"],
          description: "Generic display creative",
          assignments: [{ media_buy_id: "mb_2", buyer_ref: "buyer_b" }],
        },
        formatParameters: null,
        groupId: null,
        createdAt: new Date("2025-01-15T10:00:00Z"),
        updatedAt: new Date("2025-01-16T12:00:00Z"),
        approvedAt: null,
        approvedBy: null,
        strategyId: null,
      },
    ];
    vi.mocked(db).select = vi.fn().mockReturnValue(mockCreativeRowsChain(rows));

    const result = await queryCreatives(
      { tenantId: "t", principalId: "p" },
      {
        filters: {
          media_buy_ids: ["mb_1"],
          buyer_refs: ["buyer_a"],
          tags: ["sports"],
          name_contains: "sports",
        },
      },
    );

    expect(result.totalCount).toBe(1);
    expect(result.creatives).toHaveLength(1);
    expect(result.creatives[0]?.creative_id).toBe("c-match");
  });
});
