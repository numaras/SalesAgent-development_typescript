/**
 * Unit tests for formatService.
 *
 * Plan: Returns only tenant formats; filter by type/name.
 */
import { describe, expect, it } from "vitest";

import { ListCreativeFormatsResponseSchema } from "../schemas/creativeFormats.js";
import { listFormats } from "./formatService.js";

describe("listFormats", () => {
  it("returns default formats for tenant with empty request", async () => {
    const result = await listFormats({ tenantId: "tenant-a" }, {});

    expect(ListCreativeFormatsResponseSchema.safeParse(result).success).toBe(
      true,
    );
    expect(result.formats.length).toBeGreaterThanOrEqual(1);
    expect(result.formats.every((f) => f.format_id && f.format_id.id)).toBe(
      true,
    );
  });

  it("filters by type when request.type is provided", async () => {
    const result = await listFormats(
      { tenantId: "t" },
      { type: "display" },
    );

    expect(result.formats.every((f) => f.type === "display")).toBe(true);
    expect(result.formats.length).toBeGreaterThanOrEqual(1);
  });

  it("returns empty formats when type matches none", async () => {
    const result = await listFormats(
      { tenantId: "t" },
      { type: "audio" },
    );

    expect(result.formats).toHaveLength(0);
  });

  it("filters by format_ids when provided", async () => {
    const result = await listFormats(
      { tenantId: "t" },
      {
        format_ids: [
          { agent_url: "https://creative.adcontextprotocol.org", id: "display_300x250" },
        ],
      },
    );

    expect(result.formats.length).toBeLessThanOrEqual(1);
    if (result.formats.length === 1) {
      expect(result.formats[0].format_id.id).toBe("display_300x250");
    }
  });

  it("returns empty when format_ids match none", async () => {
    const result = await listFormats(
      { tenantId: "t" },
      {
        format_ids: [
          { agent_url: "https://creative.adcontextprotocol.org", id: "nonexistent_format" },
        ],
      },
    );

    expect(result.formats).toHaveLength(0);
  });

  it("filters by name_search with case-insensitive partial match", async () => {
    // "300x250" matches "Display 300x250" but not "Display 728x90" or "Video 16:9"
    const result = await listFormats({ tenantId: "t" }, { name_search: "300x250" });

    expect(result.formats.length).toBeGreaterThanOrEqual(1);
    expect(result.formats.every((f) => f.name?.toLowerCase().includes("300x250"))).toBe(true);

    // Case-insensitive: upper-case search term should still match
    const resultUpper = await listFormats({ tenantId: "t" }, { name_search: "DISPLAY" });
    expect(resultUpper.formats.length).toBeGreaterThanOrEqual(1);
    expect(
      resultUpper.formats.every((f) => f.name?.toLowerCase().includes("display")),
    ).toBe(true);
  });

  it("returns context field in response when provided in request", async () => {
    const ctx = { session_id: "abc123" };
    const result = await listFormats({ tenantId: "t" }, { context: ctx });

    expect(result.context).toEqual(ctx);
    expect(Array.isArray(result.creative_agents)).toBe(true);
    expect(result.errors).toBeNull();
  });
});
