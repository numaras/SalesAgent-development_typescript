/**
 * Zod schemas for update-media-buy (AdCP).
 *
 * Legacy equivalent: _legacy/src/core/schemas.py
 *   UpdateMediaBuyRequest, AdCPPackageUpdate, AffectedPackage,
 *   UpdateMediaBuySuccess, UpdateMediaBuyError.
 * Internal fields (workflow_step_id, changes_applied) are stripped before protocol response.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// PackageUpdate (request: per-package updates)
// ---------------------------------------------------------------------------

export const PackageUpdateSchema = z
  .object({
    package_id: z.string(),
    paused: z.boolean().optional(),
    budget: z.union([
      z.object({ total: z.number(), currency: z.string() }),
      z.number(),
    ]).optional(),
    creative_ids: z.array(z.string()).optional(),
    // creatives: inline creative objects (LibraryPackageUpdate1 field)
    creatives: z.array(z.record(z.string(), z.unknown())).optional(),
    targeting_overlay: z.record(z.string(), z.unknown()).optional(),
    creative_assignments: z.array(z.record(z.string(), z.unknown())).optional(),
    impressions: z.number().optional(),
    pacing: z.enum(["even", "asap", "front_loaded"]).optional(),
    // bid_price: CPM/CPC bid (LibraryPackageUpdate1 field)
    bid_price: z.number().optional(),
    // ext: passthrough extension bag (LibraryPackageUpdate1 field)
    ext: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();
export type PackageUpdate = z.infer<typeof PackageUpdateSchema>;

// ---------------------------------------------------------------------------
// UpdateMediaBuyRequest (media_buy_id OR buyer_ref required)
// ---------------------------------------------------------------------------

export const UpdateMediaBuyRequestSchema = z
  .object({
    media_buy_id: z.string().optional(),
    buyer_ref: z.string().optional(),
    start_time: z.union([z.literal("asap"), z.string()]).optional(),
    end_time: z.string().optional(),
    paused: z.boolean().optional(),
    budget: z.union([
      z.object({ total: z.number(), currency: z.string() }),
      z.number(),
    ]).optional(),
    packages: z.array(PackageUpdateSchema).optional(),
    context: z.record(z.string(), z.unknown()).optional(),
    ext: z.record(z.string(), z.unknown()).optional(),
    reporting_webhook: z.record(z.string(), z.unknown()).optional(),
    push_notification_config: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough()
  .refine(
    (data) =>
      (data.media_buy_id?.trim()?.length ?? 0) > 0 ||
      (data.buyer_ref?.trim()?.length ?? 0) > 0,
    { message: "Either media_buy_id or buyer_ref is required." },
  );
export type UpdateMediaBuyRequest = z.infer<typeof UpdateMediaBuyRequestSchema>;

// ---------------------------------------------------------------------------
// AffectedPackage (response: package_id + status/paused; internal changes_applied stripped)
// ---------------------------------------------------------------------------

export const AffectedPackageSchema = z.object({
  package_id: z.string(),
  status: z.string().optional(),
  paused: z.boolean().optional(),
  changes_applied: z.record(z.string(), z.unknown()).optional(), // internal; strip before response
});
export type AffectedPackage = z.infer<typeof AffectedPackageSchema>;

// ---------------------------------------------------------------------------
// UpdateMediaBuySuccess
// ---------------------------------------------------------------------------

export const UpdateMediaBuySuccessSchema = z.object({
  media_buy_id: z.string(),
  affected_packages: z.array(AffectedPackageSchema).optional(),
  workflow_step_id: z.string().optional(), // internal; strip before response
  // buyer_ref: set explicitly by _update_media_buy_impl (AdCPUpdateMediaBuySuccess)
  buyer_ref: z.string().optional(),
  // context: echoed back from request (Python sets on both success and error paths)
  context: z.unknown().optional(),
});
export type UpdateMediaBuySuccess = z.infer<typeof UpdateMediaBuySuccessSchema>;

// ---------------------------------------------------------------------------
// UpdateMediaBuyError
// ---------------------------------------------------------------------------

// Error object shape: Python adcp.types.Error has code + message fields
export const UpdateMediaBuyErrorItemSchema = z.object({
  code: z.string(),
  message: z.string(),
});
export type UpdateMediaBuyErrorItem = z.infer<typeof UpdateMediaBuyErrorItemSchema>;

export const UpdateMediaBuyErrorSchema = z.object({
  errors: z.array(UpdateMediaBuyErrorItemSchema),
  // context: echoed back from request (Python _update_media_buy_impl L218)
  context: z.unknown().optional(),
});
export type UpdateMediaBuyError = z.infer<typeof UpdateMediaBuyErrorSchema>;

// ---------------------------------------------------------------------------
// UpdateMediaBuyResponse (union)
// ---------------------------------------------------------------------------

export const UpdateMediaBuyResponseSchema = z.union([
  UpdateMediaBuySuccessSchema,
  UpdateMediaBuyErrorSchema,
]);
export type UpdateMediaBuyResponse = z.infer<typeof UpdateMediaBuyResponseSchema>;

/** Type guard: success has media_buy_id and optional affected_packages. */
export function isUpdateMediaBuySuccess(
  r: UpdateMediaBuyResponse,
): r is UpdateMediaBuySuccess {
  return "media_buy_id" in r && typeof (r as UpdateMediaBuySuccess).media_buy_id === "string";
}

/** Type guard: error has errors array. */
export function isUpdateMediaBuyError(
  r: UpdateMediaBuyResponse,
): r is UpdateMediaBuyError {
  return "errors" in r && Array.isArray((r as UpdateMediaBuyError).errors);
}
