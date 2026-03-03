/**
 * Get AdCP capabilities service.
 *
 * Legacy equivalent: _legacy/src/core/tools/capabilities.py → _get_adcp_capabilities_impl()
 *   Returns minimal capabilities when no tenant; full media_buy (portfolio, features, execution)
 *   when tenant context is available. Auth is optional for this endpoint.
 */
import { eq } from "drizzle-orm";

import { db } from "../db/client.js";
import { adapterConfigs } from "../db/schema/adapterConfigs.js";
import { publisherPartners } from "../db/schema/publisherPartners.js";
import { tenants } from "../db/schema/tenants.js";
import type { GetAdcpCapabilitiesResponse } from "../schemas/adcpCapabilities.js";
import {
  GetAdcpCapabilitiesResponseSchema,
  MINIMAL_CAPABILITIES_RESPONSE,
} from "../schemas/adcpCapabilities.js";

export interface TenantContext {
  tenantId: string;
  tenantName?: string;
}

const CHANNEL_MAPPING: Record<string, string> = {
  display: "display",
  olv: "olv",
  video: "olv",
  social: "social",
  search: "search",
  ctv: "ctv",
  linear_tv: "linear_tv",
  radio: "radio",
  streaming_audio: "streaming_audio",
  audio: "streaming_audio",
  podcast: "podcast",
  dooh: "dooh",
  ooh: "ooh",
  print: "print",
  cinema: "cinema",
  email: "email",
  gaming: "gaming",
  retail_media: "retail_media",
  influencer: "influencer",
  affiliate: "affiliate",
  product_placement: "product_placement",
};

const ADAPTER_DEFAULT_CHANNELS: Record<string, string[]> = {
  gam: ["display"],
  google_ad_manager: ["display"],
  mock: ["display"],
  mock_ad_server: ["display"],
  kevel: ["display"],
  triton: ["streaming_audio"],
};

interface TenantCapabilityData {
  tenantName: string;
  subdomain: string;
  advertisingPolicies: string | null;
  primaryChannels: string[];
  publisherDomains: Array<{ root: string }>;
}

function normalizeChannels(rawChannels: string[]): string[] {
  const mapped = rawChannels
    .map((channel) => CHANNEL_MAPPING[channel.toLowerCase()] ?? null)
    .filter((channel): channel is string => channel != null);

  return Array.from(new Set(mapped));
}

async function loadTenantCapabilityData(
  tenantContext: TenantContext,
): Promise<TenantCapabilityData> {
  const [tenantRow] = await db
    .select({
      name: tenants.name,
      subdomain: tenants.subdomain,
      advertisingPolicy: tenants.advertisingPolicy,
    })
    .from(tenants)
    .where(eq(tenants.tenantId, tenantContext.tenantId))
    .limit(1);

  const [adapterConfig] = await db
    .select({
      adapterType: adapterConfigs.adapterType,
      configJson: adapterConfigs.configJson,
    })
    .from(adapterConfigs)
    .where(eq(adapterConfigs.tenantId, tenantContext.tenantId))
    .limit(1);

  const publisherDomainRows = await db
    .select({
      publisherDomain: publisherPartners.publisherDomain,
    })
    .from(publisherPartners)
    .where(eq(publisherPartners.tenantId, tenantContext.tenantId));

  const configuredChannels = Array.isArray(
    adapterConfig?.configJson?.["default_channels"],
  )
    ? (adapterConfig?.configJson?.["default_channels"] as unknown[])
        .filter((value): value is string => typeof value === "string")
    : [];

  const adapterFallbackChannels = adapterConfig?.adapterType
    ? (ADAPTER_DEFAULT_CHANNELS[adapterConfig.adapterType.toLowerCase()] ?? [])
    : [];
  const primaryChannels = normalizeChannels([
    ...configuredChannels,
    ...adapterFallbackChannels,
  ]);

  const resolvedChannels = primaryChannels.length > 0 ? primaryChannels : ["display"];
  const resolvedSubdomain = tenantRow?.subdomain ?? tenantContext.tenantId;
  const resolvedPublisherDomains =
    publisherDomainRows.length > 0
      ? publisherDomainRows.map((row) => ({ root: row.publisherDomain }))
      : [{ root: `${resolvedSubdomain}.example.com` }];

  const advertisingPolicy = tenantRow?.advertisingPolicy;
  const advertisingPolicies =
    advertisingPolicy != null &&
    typeof advertisingPolicy === "object" &&
    typeof advertisingPolicy["description"] === "string"
      ? advertisingPolicy["description"]
      : null;

  return {
    tenantName: tenantRow?.name ?? tenantContext.tenantName ?? "Unknown",
    subdomain: resolvedSubdomain,
    advertisingPolicies,
    primaryChannels: resolvedChannels,
    publisherDomains: resolvedPublisherDomains,
  };
}

/**
 * Build GetAdcpCapabilitiesResponse for the given tenant context.
 *
 * When tenantContext is null/undefined, returns minimal response (adcp + supported_protocols only).
 * When tenantContext is set, returns full response with media_buy (portfolio, features, execution).
 * Adapter-specific channels and publisher domains can be added in a follow-up.
 */
export async function getAdcpCapabilities(
  tenantContext: TenantContext | null | undefined,
): Promise<GetAdcpCapabilitiesResponse> {
  if (!tenantContext) {
    return { ...MINIMAL_CAPABILITIES_RESPONSE };
  }

  const tenantData = await loadTenantCapabilityData(tenantContext).catch(() => ({
    tenantName: tenantContext.tenantName ?? "Unknown",
    subdomain: tenantContext.tenantId,
    advertisingPolicies: null,
    primaryChannels: ["display"],
    publisherDomains: [{ root: `${tenantContext.tenantId}.example.com` }],
  }));
  const now = new Date().toISOString();

  const response: GetAdcpCapabilitiesResponse = {
    adcp: { major_versions: [{ root: 3 }] },
    supported_protocols: ["media_buy"],
    media_buy: {
      portfolio: {
        description: `Advertising inventory from ${tenantData.tenantName}`,
        primary_channels: tenantData.primaryChannels,
        publisher_domains: tenantData.publisherDomains,
        ...(tenantData.advertisingPolicies != null
          ? { advertising_policies: tenantData.advertisingPolicies }
          : {}),
      },
      features: {
        content_standards: false,
        inline_creative_management: true,
        property_list_filtering: false,
      },
      execution: {
        targeting: {
          geo_countries: true,
          geo_regions: true,
        },
      },
    },
    last_updated: now,
  };

  GetAdcpCapabilitiesResponseSchema.parse(response);
  return response;
}
