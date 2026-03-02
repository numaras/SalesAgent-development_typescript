/**
 * Unit tests for creativePagination.
 */
import { describe, expect, it } from "vitest";

import { PaginationSchema } from "../schemas/creative.js";
import { buildPagination } from "./creativePagination.js";

describe("buildPagination", () => {
  it("computes total_pages and has_more for partial page", () => {
    const result = buildPagination(0, 10, 25);

    expect(PaginationSchema.safeParse(result).success).toBe(true);
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(0);
    expect(result.total_pages).toBe(3);
    expect(result.current_page).toBe(1);
    expect(result.has_more).toBe(true);
  });

  it("sets has_more false on last page", () => {
    const result = buildPagination(20, 10, 25);

    expect(result.current_page).toBe(3);
    expect(result.has_more).toBe(false);
  });

  it("handles empty totalCount", () => {
    const result = buildPagination(0, 10, 0);

    expect(result.total_pages).toBe(1);
    expect(result.current_page).toBe(1);
    expect(result.has_more).toBe(false);
  });

  it("clamps current_page to total_pages when offset exceeds", () => {
    const result = buildPagination(100, 10, 25);

    expect(result.current_page).toBe(3);
    expect(result.total_pages).toBe(3);
  });
});
