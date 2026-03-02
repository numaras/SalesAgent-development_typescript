/**
 * Zod schemas for create-media-buy (AdCP media buy creation).
 *
 * Legacy equivalent: _legacy/src/core/schemas.py
 *   CreateMediaBuyRequest, PackageRequest (Package for request), Placement, BrandManifest.
 */
import { z } from "zod";

import { FormatIdSchema } from "./product.js";

// ---------------------------------------------------------------------------
// BrandManifest (inline object or URL string)
// ---------------------------------------------------------------------------

/** Inline brand manifest (name, logo, etc.). */
export const BrandManifestSchema = z
  .object({
    name: z.string().optional(),
    logo_url: z.string().url().optional(),
    website: z.string().url().optional(),
    policies: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .passthrough();
export type BrandManifest = z.infer<typeof BrandManifestSchema>;

/** Brand manifest: inline object or URL string to hosted manifest. */
export const BrandManifestRefSchema = z.union([
  z.string().url(),
  BrandManifestSchema,
]);
export type BrandManifestRef = z.infer<typeof BrandManifestRefSchema>;

// ---------------------------------------------------------------------------
// Budget (package-level)
// ---------------------------------------------------------------------------

export const BudgetSchema = z.object({
  total: z.number(),
  currency: z.string(),
  daily_cap: z.number().optional(),
});
export type Budget = z.infer<typeof BudgetSchema>;

// ---------------------------------------------------------------------------
// Placement (within a package; description + format_ids)
// ---------------------------------------------------------------------------

export const PlacementSchema = z.object({
  description: z.string(),
  format_ids: z.array(FormatIdSchema).min(1),
});
export type Placement = z.infer<typeof PlacementSchema>;

// ---------------------------------------------------------------------------
// TargetingOverlay (optional geo/audience overlay; passthrough for AdCP compat)
// ---------------------------------------------------------------------------

export const TargetingOverlaySchema = z.record(z.string(), z.unknown());
export type TargetingOverlay = z.infer<typeof TargetingOverlaySchema>;

// ---------------------------------------------------------------------------
// PackageRequest (single package in CreateMediaBuyRequest)
// ---------------------------------------------------------------------------

export const PackageRequestSchema = z
  .object({
    budget: z.union([BudgetSchema, z.number()]),
    buyer_ref: z.string().optional(),
    pricing_option_id: z.string(),
    product_id: z.string(),
    creative_ids: z.array(z.string()).optional(),
    creatives: z.array(z.record(z.string(), z.unknown())).optional(),
    format_ids: z.array(FormatIdSchema).optional(),
    targeting_overlay: TargetingOverlaySchema.optional(),
    placements: z.array(PlacementSchema).optional(),
  })
  .passthrough();
export type PackageRequest = z.infer<typeof PackageRequestSchema>;

// ---------------------------------------------------------------------------
// CreateMediaBuyRequest
// ---------------------------------------------------------------------------

export const CreateMediaBuyRequestSchema = z
  .object({
    brand_manifest: BrandManifestRefSchema,
    buyer_ref: z.string(),
    packages: z.array(PackageRequestSchema).min(1),
    start_time: z.union([z.literal("asap"), z.string()]),
    end_time: z.string(),
    context: z.record(z.string(), z.unknown()).optional(),
    ext: z.record(z.string(), z.unknown()).optional(),
    po_number: z.string().optional(),
    reporting_webhook: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();
export type CreateMediaBuyRequest = z.infer<typeof CreateMediaBuyRequestSchema>;
