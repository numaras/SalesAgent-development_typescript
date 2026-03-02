/**
 * Zod schemas for get-media-buy-delivery (AdCP).
 *
 * Legacy equivalent: _legacy/src/core/schemas.py
 *   GetMediaBuyDeliveryRequest, GetMediaBuyDeliveryResponse,
 *   MediaBuyDeliveryData, PackageDelivery, DeliveryTotals, DailyBreakdown, ReportingPeriod, AggregatedTotals.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// GetMediaBuyDeliveryRequest (media_buy_ids, buyer_refs, status_filter, date range)
// ---------------------------------------------------------------------------

export const GetMediaBuyDeliveryRequestSchema = z
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
    start_date: z.string().optional(), // YYYY-MM-DD
    end_date: z.string().optional(), // YYYY-MM-DD
    context: z.record(z.string(), z.unknown()).optional(),
    ext: z.record(z.string(), z.unknown()).optional(),
    account_id: z.string().optional(),
  })
  .passthrough();
export type GetMediaBuyDeliveryRequest = z.infer<
  typeof GetMediaBuyDeliveryRequestSchema
>;

// ---------------------------------------------------------------------------
// DeliveryTotals (aggregate metrics)
// ---------------------------------------------------------------------------

export const DeliveryTotalsSchema = z.object({
  impressions: z.number().min(0),
  spend: z.number().min(0),
  clicks: z.number().min(0).optional(),
  ctr: z.number().min(0).max(1).optional(),
  video_completions: z.number().min(0).optional(),
  completion_rate: z.number().min(0).max(1).optional(),
});
export type DeliveryTotals = z.infer<typeof DeliveryTotalsSchema>;

// ---------------------------------------------------------------------------
// PackageDelivery (metrics by package)
// ---------------------------------------------------------------------------

export const PackageDeliverySchema = z.object({
  package_id: z.string(),
  buyer_ref: z.string().optional(),
  impressions: z.number().min(0),
  spend: z.number().min(0),
  clicks: z.number().min(0).optional(),
  video_completions: z.number().min(0).optional(),
  pacing_index: z.number().min(0).optional(),
  pricing_model: z.string().optional(),
  rate: z.number().min(0).optional(),
  currency: z.string().optional(),
});
export type PackageDelivery = z.infer<typeof PackageDeliverySchema>;

// ---------------------------------------------------------------------------
// DailyBreakdown (day-by-day metrics)
// ---------------------------------------------------------------------------

export const DailyBreakdownSchema = z.object({
  date: z.string(), // YYYY-MM-DD
  impressions: z.number().min(0),
  spend: z.number().min(0),
  notification_type: z.string().optional(),
  partial_data: z.boolean().optional(),
  unavailable_count: z.number().int().min(0).optional(),
  sequence_number: z.number().int().min(1).optional(),
  next_expected_at: z.string().optional(),
});
export type DailyBreakdown = z.infer<typeof DailyBreakdownSchema>;

// ---------------------------------------------------------------------------
// MediaBuyDeliveryData (delivery for one media buy)
// ---------------------------------------------------------------------------

export const MediaBuyDeliveryStatusSchema = z.enum([
  "ready",
  "active",
  "paused",
  "completed",
  "failed",
  "reporting_delayed",
]);
export type MediaBuyDeliveryStatus = z.infer<typeof MediaBuyDeliveryStatusSchema>;

export const MediaBuyDeliveryDataSchema = z.object({
  media_buy_id: z.string(),
  buyer_ref: z.string().optional(),
  status: MediaBuyDeliveryStatusSchema,
  expected_availability: z.string().optional(),
  is_adjusted: z.boolean().optional(),
  pricing_model: z.string().optional(),
  totals: DeliveryTotalsSchema,
  by_package: z.array(PackageDeliverySchema),
  daily_breakdown: z.array(DailyBreakdownSchema).optional(),
});
export type MediaBuyDeliveryData = z.infer<typeof MediaBuyDeliveryDataSchema>;

// ---------------------------------------------------------------------------
// ReportingPeriod (start/end for response)
// ---------------------------------------------------------------------------

export const ReportingPeriodSchema = z.object({
  start: z.string(), // ISO 8601
  end: z.string(), // ISO 8601
});
export type ReportingPeriod = z.infer<typeof ReportingPeriodSchema>;

// ---------------------------------------------------------------------------
// AggregatedTotals (combined metrics across all media buys)
// ---------------------------------------------------------------------------

export const AggregatedTotalsSchema = z.object({
  impressions: z.number().min(0),
  spend: z.number().min(0),
  clicks: z.number().min(0).optional(),
  ctr: z.number().min(0).max(1).optional(),
  video_completions: z.number().min(0).optional(),
  completion_rate: z.number().min(0).max(1).optional(),
  // Python LibraryAggregatedTotals.media_buy_count — used in _get_media_buy_delivery_impl L395
  media_buy_count: z.number().int().min(0).optional(),
});
export type AggregatedTotals = z.infer<typeof AggregatedTotalsSchema>;

// ---------------------------------------------------------------------------
// GetMediaBuyDeliveryResponse
// ---------------------------------------------------------------------------

export const GetMediaBuyDeliveryResponseSchema = z.object({
  reporting_period: ReportingPeriodSchema,
  currency: z.string(),
  aggregated_totals: AggregatedTotalsSchema,
  media_buy_deliveries: z.array(MediaBuyDeliveryDataSchema),
  // Python uses list[Error] where Error = {code: str, message: str} (adcp.types.Error)
  errors: z.array(z.object({ code: z.string(), message: z.string() })).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  ext: z.record(z.string(), z.unknown()).optional(),
  notification_type: z.string().optional(),
  partial_data: z.boolean().optional(),
  sequence_number: z.number().optional(),
  unavailable_count: z.number().optional(),
  next_expected_at: z.string().optional(),
});
export type GetMediaBuyDeliveryResponse = z.infer<
  typeof GetMediaBuyDeliveryResponseSchema
>;
