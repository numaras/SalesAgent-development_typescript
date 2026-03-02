/**
 * Zod schemas for list-creatives (AdCP creative library).
 *
 * Legacy equivalent: _legacy/src/core/schemas.py
 *   Creative(LibraryCreative), ListCreativesRequest, ListCreativesResponse, Pagination.
 */
import { z } from "zod";

import { FormatIdSchema } from "./product.js";

// ---------------------------------------------------------------------------
// CreativeStatus
// ---------------------------------------------------------------------------

export const CreativeStatusSchema = z.enum([
  "processing",
  "approved",
  "rejected",
  "pending_review",
]);
export type CreativeStatus = z.infer<typeof CreativeStatusSchema>;

// ---------------------------------------------------------------------------
// Creative (single creative asset; API response shape)
// ---------------------------------------------------------------------------

export const CreativeSchema = z
  .object({
    creative_id: z.string(),
    name: z.string(),
    format_id: FormatIdSchema,
    created_date: z.string(),
    updated_date: z.string(),
    status: CreativeStatusSchema,

    assets: z.record(z.string(), z.unknown()).optional(),
    click_url: z.string().url().optional(),
    media_url: z.string().url().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    duration: z.number().optional(),
    tags: z.array(z.string()).optional(),
    performance: z.record(z.string(), z.unknown()).optional(),
    assignments: z.array(z.record(z.string(), z.unknown())).optional(),
    sub_assets: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .passthrough();
export type Creative = z.infer<typeof CreativeSchema>;

// ---------------------------------------------------------------------------
// Pagination (request: offset/limit; response: total_pages, current_page, has_more)
// ---------------------------------------------------------------------------

export const PaginationRequestSchema = z.object({
  offset: z.number().int().min(0).optional(),
  limit: z.number().int().min(1).max(1000).optional(),
});
export type PaginationRequest = z.infer<typeof PaginationRequestSchema>;

export const PaginationSchema = z.object({
  limit: z.number().int(),
  offset: z.number().int(),
  total_pages: z.number().int().optional(),
  current_page: z.number().int().optional(),
  has_more: z.boolean().optional(),
});
export type Pagination = z.infer<typeof PaginationSchema>;

// ---------------------------------------------------------------------------
// Sort
// ---------------------------------------------------------------------------

export const SortSchema = z
  .object({
    field: z.string().optional(),
    direction: z.enum(["asc", "desc"]).optional(),
  })
  .passthrough();
export type Sort = z.infer<typeof SortSchema>;

// ---------------------------------------------------------------------------
// CreativeFilters (list-creatives request filters)
// ---------------------------------------------------------------------------

export const CreativeFiltersSchema = z
  .object({
    statuses: z.array(z.string()).optional(),
    formats: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    created_after: z.string().optional(),
    created_before: z.string().optional(),
    media_buy_ids: z.array(z.string()).optional(),
    buyer_refs: z.array(z.string()).optional(),
    name_contains: z.string().optional(),
  })
  .passthrough();
export type CreativeFilters = z.infer<typeof CreativeFiltersSchema>;

// ---------------------------------------------------------------------------
// ListCreativesRequest (all fields optional per AdCP)
// ---------------------------------------------------------------------------

export const ListCreativesRequestSchema = z
  .object({
    filters: CreativeFiltersSchema.optional(),
    pagination: PaginationRequestSchema.optional(),
    sort: SortSchema.optional(),
    fields: z.array(z.string()).optional(),
    include_performance: z.boolean().optional(),
    include_assignments: z.boolean().optional(),
    include_sub_assets: z.boolean().optional(),
  })
  .passthrough();
export type ListCreativesRequest = z.infer<typeof ListCreativesRequestSchema>;

// ---------------------------------------------------------------------------
// QuerySummary (part of list response)
// ---------------------------------------------------------------------------

export const QuerySummarySchema = z
  .object({
    returned: z.number().int(),
    total_matching: z.number().int(),
    filters_applied: z.array(z.string()).optional(),
    sort_applied: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();
export type QuerySummary = z.infer<typeof QuerySummarySchema>;

// ---------------------------------------------------------------------------
// ListCreativesResponse
// ---------------------------------------------------------------------------

export const ListCreativesResponseSchema = z.object({
  creatives: z.array(CreativeSchema),
  pagination: PaginationSchema,
  query_summary: QuerySummarySchema,
  format_summary: z.unknown().nullable().optional(),
  status_summary: z.unknown().nullable().optional(),
  context: z.unknown().optional(),
});
export type ListCreativesResponse = z.infer<typeof ListCreativesResponseSchema>;
