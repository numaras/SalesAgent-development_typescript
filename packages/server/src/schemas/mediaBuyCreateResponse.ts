/**
 * Zod schemas for create-media-buy response (AdCP).
 *
 * Legacy equivalent: _legacy/src/core/schemas.py
 *   CreateMediaBuySuccess, CreateMediaBuyError (CreateMediaBuyResponse = Success | Error).
 * Internal fields (workflow_step_id, platform_line_item_id) are stripped before protocol response.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Package (response: package_id + status only in protocol response)
// ---------------------------------------------------------------------------

export const PackageStatusSchema = z.enum([
  "draft",
  "pending_approval",
  "approved",
  "rejected",
  "active",
  "paused",
  "completed",
]);
export type PackageStatus = z.infer<typeof PackageStatusSchema>;

export const PackageResponseSchema = z.object({
  package_id: z.string(),
  status: PackageStatusSchema,
});
export type PackageResponse = z.infer<typeof PackageResponseSchema>;

// ---------------------------------------------------------------------------
// CreateMediaBuySuccess (with optional workflow_step_id for internal use)
// ---------------------------------------------------------------------------

export const CreateMediaBuySuccessSchema = z.object({
  media_buy_id: z.string().optional(),
  buyer_ref: z.string().optional(),
  packages: z.array(PackageResponseSchema),
  workflow_step_id: z.string().optional(), // internal; strip before sending to client
});
export type CreateMediaBuySuccess = z.infer<typeof CreateMediaBuySuccessSchema>;

// ---------------------------------------------------------------------------
// CreateMediaBuyError
// ---------------------------------------------------------------------------

export const CreateMediaBuyErrorSchema = z.object({
  errors: z.array(z.string()),
});
export type CreateMediaBuyError = z.infer<typeof CreateMediaBuyErrorSchema>;

// ---------------------------------------------------------------------------
// CreateMediaBuyResponse (discriminated union: success has packages, error has errors)
// ---------------------------------------------------------------------------

export const CreateMediaBuyResponseSchema = z.union([
  CreateMediaBuySuccessSchema,
  CreateMediaBuyErrorSchema,
]);
export type CreateMediaBuyResponse = z.infer<typeof CreateMediaBuyResponseSchema>;

/** Type guard: success has packages array. */
export function isCreateMediaBuySuccess(
  r: CreateMediaBuyResponse,
): r is CreateMediaBuySuccess {
  return "packages" in r && Array.isArray((r as CreateMediaBuySuccess).packages);
}

/** Type guard: error has errors array. */
export function isCreateMediaBuyError(
  r: CreateMediaBuyResponse,
): r is CreateMediaBuyError {
  return "errors" in r && Array.isArray((r as CreateMediaBuyError).errors);
}
