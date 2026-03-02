/**
 * Zod schemas for sync-creatives (AdCP sync creative assets).
 *
 * Legacy equivalent: _legacy/src/core/schemas.py
 *   SyncCreativesRequest, SyncCreativesResponse (success/error union),
 *   SyncCreativeResult, CreativeAssignment.
 */
import { z } from "zod";

import { FormatIdSchema } from "./product.js";

// ---------------------------------------------------------------------------
// CreativeAsset (input creative for sync; minimal for create/update)
// ---------------------------------------------------------------------------

export const CreativeAssetSchema = z
  .object({
    creative_id: z.string(),
    name: z.string().optional(),
    format_id: FormatIdSchema,
    assets: z.record(z.string(), z.unknown()).optional(),
    click_url: z.string().url().optional(),
    media_url: z.string().url().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    duration: z.number().optional(),
    tags: z.array(z.string()).optional(),
  })
  .passthrough();
export type CreativeAsset = z.infer<typeof CreativeAssetSchema>;

// ---------------------------------------------------------------------------
// CreativeAssignment (assignment of creative to package(s))
// ---------------------------------------------------------------------------

export const CreativeAssignmentSchema = z
  .object({
    creative_id: z.string(),
    placement_ids: z.array(z.string()).optional(),
    weight: z.number().optional(),
  })
  .passthrough();
export type CreativeAssignment = z.infer<typeof CreativeAssignmentSchema>;

// ---------------------------------------------------------------------------
// SyncCreativesRequest
// ---------------------------------------------------------------------------

export const PushNotificationConfigSchema = z
  .object({
    url: z.string().url().optional(),
    authentication: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();
export type PushNotificationConfig = z.infer<typeof PushNotificationConfigSchema>;

export const SyncCreativesRequestSchema = z
  .object({
    creatives: z.array(CreativeAssetSchema),
    assignments: z.record(z.string(), z.array(z.string())).optional(),
    creative_ids: z.array(z.string()).optional(),
    delete_missing: z.boolean().optional(),
    dry_run: z.boolean().optional(),
    validation_mode: z.enum(["strict", "lenient"]).optional(),
    push_notification_config: PushNotificationConfigSchema.optional(),
  })
  .passthrough();
export type SyncCreativesRequest = z.infer<typeof SyncCreativesRequestSchema>;

// ---------------------------------------------------------------------------
// SyncCreativeResult (per-creative result in response)
// ---------------------------------------------------------------------------

export const CreativeActionSchema = z.enum([
  "created",
  "updated",
  "deleted",
  "failed",
]);
export type CreativeAction = z.infer<typeof CreativeActionSchema>;

export const SyncCreativeResultSchema = z
  .object({
    creative_id: z.string(),
    action: CreativeActionSchema,
    platform_id: z.string().optional(),
    changes: z.array(z.string()).optional(),
    errors: z.array(z.string()).optional(),
    warnings: z.array(z.string()).optional(),
    assigned_to: z.array(z.string()).optional(),
    assignment_errors: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .passthrough();
export type SyncCreativeResult = z.infer<typeof SyncCreativeResultSchema>;

// ---------------------------------------------------------------------------
// SyncCreativesResponse (success | error union)
// ---------------------------------------------------------------------------

export const SyncCreativesSuccessSchema = z.object({
  creatives: z.array(SyncCreativeResultSchema),
  dry_run: z.boolean().optional(),
});
export type SyncCreativesSuccess = z.infer<typeof SyncCreativesSuccessSchema>;

export const SyncCreativesErrorSchema = z.object({
  errors: z.array(z.string()),
});
export type SyncCreativesError = z.infer<typeof SyncCreativesErrorSchema>;

/** Success: has creatives array. Error: has errors array (no creatives). */
export const SyncCreativesResponseSchema = z.union([
  SyncCreativesSuccessSchema,
  SyncCreativesErrorSchema,
]);
export type SyncCreativesResponse = z.infer<typeof SyncCreativesResponseSchema>;
