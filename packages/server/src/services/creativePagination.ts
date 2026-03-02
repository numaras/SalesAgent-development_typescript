/**
 * Pagination helper for list-creatives (offset/limit → Pagination object).
 *
 * Legacy equivalent: _legacy/src/core/tools/creatives/listing.py – pagination logic
 *   offset = (page - 1) * limit; total_pages, current_page, has_more.
 */
import type { Pagination } from "../schemas/creative.js";

/**
 * Build a Pagination object from offset, limit, and total count.
 *
 * - current_page: 1-based page index (derived from offset and limit).
 * - total_pages: ceil(totalCount / limit), or 1 when totalCount is 0.
 * - has_more: true when there are more results after the current page.
 */
export function buildPagination(
  offset: number,
  limit: number,
  totalCount: number,
): Pagination {
  const totalPages =
    limit > 0 ? Math.max(1, Math.ceil(totalCount / limit)) : 1;
  const currentPage =
    limit > 0 ? Math.min(totalPages, Math.floor(offset / limit) + 1) : 1;
  const hasMore = offset + limit < totalCount;

  return {
    limit,
    offset,
    total_pages: totalPages,
    current_page: currentPage,
    has_more: hasMore,
  };
}
