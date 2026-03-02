/**
 * Zod schemas for Product, ProductCard, and Pricing (AdCP product domain).
 *
 * Legacy equivalent: _legacy/src/core/schemas.py
 *   Product(LibraryProduct), ProductCard(LibraryProductCard), Pricing from adcp.types.
 * API uses snake_case; DB layer may map to camelCase.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// FormatId (AdCP creative format reference)
// ---------------------------------------------------------------------------

export const FormatIdSchema = z.object({
  agent_url: z.string().url(),
  id: z.string(),
});
export type FormatId = z.infer<typeof FormatIdSchema>;

// ---------------------------------------------------------------------------
// Pricing (single pricing option; AdCP V3 consolidated types)
// ---------------------------------------------------------------------------

export const PricingModelSchema = z.enum([
  "cpm",
  "vcpm",
  "cpc",
  "cpcv",
  "cpv",
  "cpp",
  "flat_rate",
]);
export type PricingModel = z.infer<typeof PricingModelSchema>;

/** Price guidance percentiles and optional floor (auction pricing). */
export const PriceGuidanceSchema = z
  .object({
    floor: z.number().optional(),
    p25: z.number().optional(),
    p50: z.number().optional(),
    p75: z.number().optional(),
    p90: z.number().optional(),
  })
  .passthrough();
export type PriceGuidance = z.infer<typeof PriceGuidanceSchema>;

/** Single pricing option (Cpm, Vcpm, Cpc, etc.). Fixed vs auction by presence of fixed_price vs floor_price/price_guidance. */
export const PricingOptionSchema = z
  .object({
    pricing_option_id: z.string(),
    pricing_model: PricingModelSchema,
    currency: z.string(),
    fixed_price: z.number().optional(),
    floor_price: z.number().optional(),
    price_guidance: PriceGuidanceSchema.optional(),
    min_spend_per_package: z.number().optional(),
    parameters: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();
export type PricingOption = z.infer<typeof PricingOptionSchema>;

/** Alias for a single pricing option (LibraryPricing in legacy). */
export const PricingSchema = PricingOptionSchema;
export type Pricing = z.infer<typeof PricingSchema>;

// ---------------------------------------------------------------------------
// ProductCard (visual card for UI; 300x400px standard)
// ---------------------------------------------------------------------------

export const ProductCardSchema = z
  .object({
    image_url: z.string().url().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
  })
  .passthrough();
export type ProductCard = z.infer<typeof ProductCardSchema>;

// ---------------------------------------------------------------------------
// Publisher property (discriminated: by_domain, by_id, by_tag)
// ---------------------------------------------------------------------------

export const PublisherPropertySchema = z
  .object({
    publisher_domain: z.string().optional(),
    property_id: z.string().optional(),
    selection_type: z.enum(["by_domain", "by_id", "by_tag"]).optional(),
    property_tags: z.array(z.string()).optional(),
  })
  .passthrough();
export type PublisherProperty = z.infer<typeof PublisherPropertySchema>;

// ---------------------------------------------------------------------------
// Delivery measurement
// ---------------------------------------------------------------------------

export const DeliveryMeasurementSchema = z
  .object({
    provider: z.string(),
    notes: z.string().optional(),
  })
  .passthrough();
export type DeliveryMeasurement = z.infer<typeof DeliveryMeasurementSchema>;

// ---------------------------------------------------------------------------
// Product (AdCP Product; API response shape)
// ---------------------------------------------------------------------------

export const ProductSchema = z.object({
  product_id: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),

  format_ids: z.array(FormatIdSchema).min(0),
  delivery_type: z.string(),
  delivery_measurement: DeliveryMeasurementSchema.optional(),

  publisher_properties: z.array(PublisherPropertySchema).min(0),
  pricing_options: z.array(PricingOptionSchema).min(0),

  is_custom: z.boolean().optional(),

  measurement: z.record(z.string(), z.unknown()).optional(),
  creative_policy: z.record(z.string(), z.unknown()).optional(),
  product_card: ProductCardSchema.optional(),
  product_card_detailed: z.record(z.string(), z.unknown()).optional(),
  placements: z.array(z.record(z.string(), z.unknown())).optional(),
  reporting_capabilities: z.record(z.string(), z.unknown()).optional(),
});
export type Product = z.infer<typeof ProductSchema>;
