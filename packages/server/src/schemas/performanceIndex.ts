/**
 * Zod schemas for update-performance-index (AdCP).
 *
 * Legacy equivalent: _legacy/src/core/schemas.py
 *   ProductPerformance, UpdatePerformanceIndexRequest, UpdatePerformanceIndexResponse.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// ProductPerformance (per-product/package performance data)
// ---------------------------------------------------------------------------

export const ProductPerformanceSchema = z.object({
  product_id: z.string(),
  performance_index: z.number(), // 1.0 = baseline, >1 = better, <1 = worse
  confidence_score: z.number().min(0).max(1).optional(),
});
export type ProductPerformance = z.infer<typeof ProductPerformanceSchema>;

// ---------------------------------------------------------------------------
// UpdatePerformanceIndexRequest
// ---------------------------------------------------------------------------

export const UpdatePerformanceIndexRequestSchema = z.object({
  media_buy_id: z.string(),
  performance_data: z.array(ProductPerformanceSchema),
  context: z.record(z.string(), z.unknown()).optional(),
  webhook_url: z.string().url().optional(),
});
export type UpdatePerformanceIndexRequest = z.infer<
  typeof UpdatePerformanceIndexRequestSchema
>;

// ---------------------------------------------------------------------------
// UpdatePerformanceIndexResponse
// ---------------------------------------------------------------------------

export const UpdatePerformanceIndexResponseSchema = z.object({
  status: z.enum(["success", "failed"]),
  detail: z.string(),
  context: z.record(z.string(), z.unknown()).optional(),
});
export type UpdatePerformanceIndexResponse = z.infer<
  typeof UpdatePerformanceIndexResponseSchema
>;
