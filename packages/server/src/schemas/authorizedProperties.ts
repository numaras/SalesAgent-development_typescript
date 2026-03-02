/**
 * Zod schemas for list-authorized-properties (AdCP property discovery).
 *
 * Legacy equivalent: _legacy/src/core/schemas.py
 *   ListAuthorizedPropertiesRequest, ListAuthorizedPropertiesResponse.
 * Note: ListAuthorizedProperties was removed from adcp 3.2.0; we define locally.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Property / PublisherDomain (single domain reference)
// ---------------------------------------------------------------------------

/** Publisher domain as object (AdCP library uses RootModel with root). */
export const PublisherDomainSchema = z.object({
  root: z.string(),
});
export type PublisherDomain = z.infer<typeof PublisherDomainSchema>;

/** Property reference (domain string or object). */
export const PropertySchema = z.union([
  z.string(),
  PublisherDomainSchema,
]);
export type Property = z.infer<typeof PropertySchema>;

// ---------------------------------------------------------------------------
// ListAuthorizedPropertiesRequest (all fields optional)
// ---------------------------------------------------------------------------

export const ListAuthorizedPropertiesRequestSchema = z
  .object({
    context: z.record(z.string(), z.unknown()).optional(),
    ext: z.record(z.string(), z.unknown()).optional(),
    property_tags: z.array(z.string()).optional(),
    publisher_domains: z.array(z.string()).optional(),
  })
  .passthrough();
export type ListAuthorizedPropertiesRequest = z.infer<
  typeof ListAuthorizedPropertiesRequestSchema
>;

// ---------------------------------------------------------------------------
// ListAuthorizedPropertiesResponse
// ---------------------------------------------------------------------------

export const ListAuthorizedPropertiesResponseSchema = z.object({
  publisher_domains: z.array(z.string()),
  context: z.record(z.string(), z.unknown()).optional(),
  primary_channels: z.array(z.string()).optional(),
  primary_countries: z.array(z.string()).optional(),
  portfolio_description: z.string().optional(),
  advertising_policies: z.string().optional(),
  last_updated: z.string().optional(),
  errors: z.array(z.record(z.string(), z.unknown())).optional(),
});
export type ListAuthorizedPropertiesResponse = z.infer<
  typeof ListAuthorizedPropertiesResponseSchema
>;
