/**
 * Zod schemas for GetAdcpCapabilities (AdCP v3 capabilities response).
 *
 * Legacy equivalent: _legacy/src/core/tools/capabilities.py
 *   Uses adcp.types.GetAdcpCapabilitiesResponse; shape matches
 *   adcp.types.generated_poc.protocol.get_adcp_capabilities_response.
 *
 * Minimal response: adcp + supported_protocols only.
 * Full response may include media_buy (portfolio, features, execution) and last_updated.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// AdCP / MajorVersion
// ---------------------------------------------------------------------------

export const MajorVersionSchema = z.object({
  root: z.number().int().min(1),
});

export const AdcpSchema = z.object({
  major_versions: z.array(MajorVersionSchema).min(1),
});

// ---------------------------------------------------------------------------
// Supported protocols
// ---------------------------------------------------------------------------

export const SupportedProtocolSchema = z.enum(["media_buy"]);
export type SupportedProtocol = z.infer<typeof SupportedProtocolSchema>;

// ---------------------------------------------------------------------------
// Media buy (optional nested)
// ---------------------------------------------------------------------------

export const PublisherDomainSchema = z.object({
  root: z.string(),
});

export const PortfolioSchema = z.object({
  description: z.string().optional(),
  primary_channels: z.array(z.string()).optional(),
  publisher_domains: z.array(PublisherDomainSchema).optional(),
  advertising_policies: z.string().optional(),
});

export const MediaBuyFeaturesSchema = z.object({
  content_standards: z.boolean().optional(),
  inline_creative_management: z.boolean().optional(),
  property_list_filtering: z.boolean().optional(),
});

export const GeoMetrosSchema = z.object({
  nielsen_dma: z.boolean().optional(),
  eurostat_nuts2: z.boolean().optional(),
  uk_itl1: z.boolean().optional(),
  uk_itl2: z.boolean().optional(),
});

export const GeoPostalAreasSchema = z.object({
  us_zip: z.boolean().optional(),
  us_zip_plus_four: z.boolean().optional(),
  ca_fsa: z.boolean().optional(),
  ca_full: z.boolean().optional(),
  gb_outward: z.boolean().optional(),
  gb_full: z.boolean().optional(),
  de_plz: z.boolean().optional(),
  fr_code_postal: z.boolean().optional(),
  au_postcode: z.boolean().optional(),
});

export const TargetingSchema = z.object({
  geo_countries: z.boolean().optional(),
  geo_regions: z.boolean().optional(),
  geo_metros: GeoMetrosSchema.optional(),
  geo_postal_areas: GeoPostalAreasSchema.optional(),
});

export const ExecutionSchema = z.object({
  targeting: TargetingSchema.optional(),
});

export const MediaBuySchema = z.object({
  portfolio: PortfolioSchema.optional(),
  features: MediaBuyFeaturesSchema.optional(),
  execution: ExecutionSchema.optional(),
});

// ---------------------------------------------------------------------------
// GetAdcpCapabilitiesResponse
// ---------------------------------------------------------------------------

export const GetAdcpCapabilitiesResponseSchema = z.object({
  adcp: AdcpSchema,
  supported_protocols: z.array(SupportedProtocolSchema).min(1),
  media_buy: MediaBuySchema.optional(),
  last_updated: z.string().datetime().optional(),
});

export type GetAdcpCapabilitiesResponse = z.infer<
  typeof GetAdcpCapabilitiesResponseSchema
>;

// ---------------------------------------------------------------------------
// Minimal response constant (no tenant / no media_buy)
// ---------------------------------------------------------------------------

export const MINIMAL_CAPABILITIES_RESPONSE: GetAdcpCapabilitiesResponse = {
  adcp: { major_versions: [{ root: 3 }] },
  supported_protocols: ["media_buy"],
} as const;
