/**
 * Zod schemas for GetProducts request and response (AdCP get-products).
 *
 * Legacy equivalent: _legacy/src/core/schemas.py
 *   GetProductsRequest(LibraryGetProductsRequest), GetProductsResponse(LibraryGetProductsResponse).
 * All request fields are optional per AdCP spec.
 */
import { z } from "zod";
import { ProductSchema } from "./product.js";
import { FormatIdSchema } from "./product.js";

// ---------------------------------------------------------------------------
// Request: optional filters (AdCP ProductFilters)
// ---------------------------------------------------------------------------

export const ProductFiltersSchema = z
  .object({
    delivery_type: z.enum(["guaranteed", "non_guaranteed"]).optional(),
    format_ids: z.array(FormatIdSchema).optional(),
    format_types: z.array(z.string()).optional(),
    is_fixed_price: z.boolean().optional(),
    min_exposures: z.number().optional(),
    standard_formats_only: z.boolean().optional(),
    countries: z.array(z.string()).optional(),
  })
  .passthrough();
export type ProductFilters = z.infer<typeof ProductFiltersSchema>;

// ---------------------------------------------------------------------------
// Request: brand manifest (inline object or URL string)
// ---------------------------------------------------------------------------

export const BrandManifestSchema = z
  .object({
    name: z.string().optional(),
    tagline: z.string().optional(),
  })
  .passthrough();
export type BrandManifest = z.infer<typeof BrandManifestSchema>;

/** Brand manifest: inline object or URL string. */
export const BrandManifestReferenceSchema = z.union([
  BrandManifestSchema,
  z.string().url(),
]);
export type BrandManifestReference = z.infer<typeof BrandManifestReferenceSchema>;

// ---------------------------------------------------------------------------
// GetProductsRequest (all fields optional per AdCP)
// ---------------------------------------------------------------------------

export const GetProductsRequestSchema = z
  .object({
    account_id: z.string().optional(),
    brand_manifest: BrandManifestReferenceSchema.optional(),
    brief: z.string().optional(),
    context: z.string().optional(),
    ext: z.record(z.string(), z.unknown()).optional(),
    filters: ProductFiltersSchema.optional(),
    property_list: z.array(z.string()).optional(),
    proposal_id: z.string().optional(),
  })
  .passthrough();
export type GetProductsRequest = z.infer<typeof GetProductsRequestSchema>;

// ---------------------------------------------------------------------------
// GetProductsResponse
// ---------------------------------------------------------------------------

export const GetProductsResponseSchema = z.object({
  products: z.array(ProductSchema),
  errors: z.array(z.record(z.string(), z.unknown())).optional(),
  context: z.unknown().optional(),
});
export type GetProductsResponse = z.infer<typeof GetProductsResponseSchema>;
