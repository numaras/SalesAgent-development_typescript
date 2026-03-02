/**
 * Zod schemas for list-creative-formats (AdCP creative format catalog).
 *
 * Legacy equivalent: _legacy/src/core/schemas.py
 *   ListCreativeFormatsRequest, ListCreativeFormatsResponse, Format, FormatId.
 */
import { z } from "zod";

import { FormatIdSchema } from "./product.js";

// ---------------------------------------------------------------------------
// FormatId (re-export for list-creative-formats consumers)
// ---------------------------------------------------------------------------

export { FormatIdSchema } from "./product.js";
export type { FormatId } from "./product.js";

// ---------------------------------------------------------------------------
// Format (single creative format; AdCP spec)
// ---------------------------------------------------------------------------

/** Dimensions (width/height in pixels). */
export const DimensionsSchema = z
  .object({
    width: z.number().optional(),
    height: z.number().optional(),
  })
  .passthrough();
export type Dimensions = z.infer<typeof DimensionsSchema>;

/** Single render specification (e.g. primary size). */
export const RenderSchema = z
  .object({
    dimensions: DimensionsSchema.optional(),
    label: z.string().optional(),
  })
  .passthrough();
export type Render = z.infer<typeof RenderSchema>;

/** Asset requirement (e.g. image, video, text). */
export const AssetSchema = z
  .object({
    asset_id: z.string().optional(),
    required: z.boolean().optional(),
    content_type: z.string().optional(),
  })
  .passthrough();
export type Asset = z.infer<typeof AssetSchema>;

export const FormatSchema = z
  .object({
    format_id: FormatIdSchema,
    name: z.string().optional(),
    description: z.string().optional(),
    type: z.string().optional(),
    renders: z.array(RenderSchema).optional(),
    assets: z.array(AssetSchema).optional(),
    is_standard: z.boolean().optional(),
  })
  .passthrough();
export type Format = z.infer<typeof FormatSchema>;

// ---------------------------------------------------------------------------
// ListCreativeFormatsRequest (all fields optional per AdCP)
// ---------------------------------------------------------------------------

export const ListCreativeFormatsRequestSchema = z
  .object({
    format_ids: z.array(FormatIdSchema).optional(),
    type: z.string().optional(),
    standard_only: z.boolean().optional(),
    category: z.string().optional(),
    is_responsive: z.boolean().optional(),
    name_search: z.string().optional(),
    asset_types: z.array(z.string()).optional(),
    min_width: z.number().optional(),
    max_width: z.number().optional(),
    min_height: z.number().optional(),
    max_height: z.number().optional(),
    context: z.unknown().optional(),
  })
  .passthrough();
export type ListCreativeFormatsRequest = z.infer<
  typeof ListCreativeFormatsRequestSchema
>;

// ---------------------------------------------------------------------------
// ListCreativeFormatsResponse
// ---------------------------------------------------------------------------

export const ListCreativeFormatsResponseSchema = z.object({
  formats: z.array(FormatSchema),
  creative_agents: z.array(z.unknown()).nullable().optional(),
  errors: z.array(z.unknown()).nullable().optional(),
  context: z.unknown().optional(),
});
export type ListCreativeFormatsResponse = z.infer<
  typeof ListCreativeFormatsResponseSchema
>;
