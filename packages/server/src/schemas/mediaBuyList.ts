/**
 * Zod schemas for get-media-buys (AdCP).
 *
 * Legacy equivalent: _legacy/src/core/tools/media_buy_list.py
 *   GetMediaBuysRequest, GetMediaBuysResponse, MediaBuySummary.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// GetMediaBuysRequest
// ---------------------------------------------------------------------------

export const GetMediaBuysRequestSchema = z
  .object({
    media_buy_ids: z.array(z.string()).optional(),
    buyer_refs: z.array(z.string()).optional(),
    status_filter: z
      .union([
        z.enum([
          "draft",
          "pending_activation",
          "ready",
          "active",
          "paused",
          "completed",
          "failed",
          "reporting_delayed",
          "all",
        ]),
        z.array(z.string()),
      ])
      .optional(),
    limit: z.number().int().min(1).max(100).optional().default(20),
    offset: z.number().int().min(0).optional().default(0),
    context: z.record(z.string(), z.unknown()).optional(),
    ext: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export type GetMediaBuysRequest = z.infer<typeof GetMediaBuysRequestSchema>;

// ---------------------------------------------------------------------------
// MediaBuySummary (one row in the response list)
// ---------------------------------------------------------------------------

export const MediaBuySummarySchema = z.object({
  media_buy_id: z.string(),
  buyer_ref: z.string().nullable().optional(),
  order_name: z.string(),
  advertiser_name: z.string(),
  status: z.string(),
  budget: z.number().nullable().optional(),
  currency: z.string().optional(),
  start_date: z.string(),
  end_date: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type MediaBuySummary = z.infer<typeof MediaBuySummarySchema>;

// ---------------------------------------------------------------------------
// GetMediaBuysResponse
// ---------------------------------------------------------------------------

export const GetMediaBuysResponseSchema = z.object({
  media_buys: z.array(MediaBuySummarySchema),
  total: z.number().int().min(0),
  offset: z.number().int().min(0),
  limit: z.number().int().min(1),
  has_more: z.boolean(),
});

export type GetMediaBuysResponse = z.infer<typeof GetMediaBuysResponseSchema>;
