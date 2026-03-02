/**
 * List authorized properties service: tenant-scoped publisher domains.
 *
 * Legacy equivalent: _legacy/src/core/tools/properties.py
 *   _list_authorized_properties_impl() — query PublisherPartner by tenant_id,
 *   return sorted publisher_domains; optional filters (property_tags, publisher_domains).
 *   Also reads tenant.advertising_policy to build advertising_policies text,
 *   writes audit log on success/failure, and wraps errors as PROPERTIES_ERROR.
 */
import { eq } from "drizzle-orm";

import { db } from "../db/client.js";
import { auditLogs } from "../db/schema/auditLogs.js";
import { publisherPartners } from "../db/schema/publisherPartners.js";
import { tenants } from "../db/schema/tenants.js";
import type {
  ListAuthorizedPropertiesRequest,
  ListAuthorizedPropertiesResponse,
} from "../schemas/authorizedProperties.js";

export interface ListAuthorizedPropertiesContext {
  tenantId: string;
  /** Optional: used for audit logging. May be absent on public/anonymous discovery requests. */
  principalId?: string;
}

/** Build human-readable advertising policies text from tenant advertising_policy config.
 * Parity with _legacy/src/core/tools/properties.py L122-163.
 */
function buildAdvertisingPoliciesText(
  advertisingPolicy: Record<string, unknown> | null | undefined,
): string | undefined {
  if (!advertisingPolicy || !advertisingPolicy["enabled"]) return undefined;

  const parts: string[] = [];

  const defaultCategories = advertisingPolicy["default_prohibited_categories"];
  if (Array.isArray(defaultCategories) && defaultCategories.length > 0) {
    parts.push(`**Baseline Protected Categories:** ${(defaultCategories as string[]).join(", ")}`);
  }

  const defaultTactics = advertisingPolicy["default_prohibited_tactics"];
  if (Array.isArray(defaultTactics) && defaultTactics.length > 0) {
    parts.push(`**Baseline Prohibited Tactics:** ${(defaultTactics as string[]).join(", ")}`);
  }

  const additionalCategories = advertisingPolicy["prohibited_categories"];
  if (Array.isArray(additionalCategories) && additionalCategories.length > 0) {
    parts.push(`**Additional Prohibited Categories:** ${(additionalCategories as string[]).join(", ")}`);
  }

  const additionalTactics = advertisingPolicy["prohibited_tactics"];
  if (Array.isArray(additionalTactics) && additionalTactics.length > 0) {
    parts.push(`**Additional Prohibited Tactics:** ${(additionalTactics as string[]).join(", ")}`);
  }

  const blockedAdvertisers = advertisingPolicy["prohibited_advertisers"];
  if (Array.isArray(blockedAdvertisers) && blockedAdvertisers.length > 0) {
    parts.push(`**Blocked Advertisers/Domains:** ${(blockedAdvertisers as string[]).join(", ")}`);
  }

  if (parts.length === 0) return undefined;

  return (
    parts.join("\n\n") +
    "\n\n**Policy Enforcement:** Campaigns are analyzed using AI against these policies. " +
    "Violations will result in campaign rejection or require manual review."
  );
}

/**
 * List publisher domains this agent is authorized to represent (tenant-scoped).
 * Returns empty list when tenant has no publisher partners.
 */
export async function listAuthorizedProperties(
  ctx: ListAuthorizedPropertiesContext,
  request?: ListAuthorizedPropertiesRequest,
): Promise<ListAuthorizedPropertiesResponse> {
  const principalId = ctx.principalId ?? "anonymous";

  try {
    const rows = await db
      .select({ publisherDomain: publisherPartners.publisherDomain })
      .from(publisherPartners)
      .where(eq(publisherPartners.tenantId, ctx.tenantId));

    const publisherDomains = [...rows.map((r) => r.publisherDomain)].sort();

    if (publisherDomains.length === 0) {
      const response: ListAuthorizedPropertiesResponse = {
        publisher_domains: [],
        portfolio_description:
          "No publisher partnerships are currently configured. Publishers can be added via the Admin UI.",
      };
      if (request?.context != null) {
        response.context = request.context;
      }
      return response;
    }

    // Fetch tenant advertising_policy for policies text generation
    const tenantRows = await db
      .select({ advertisingPolicy: tenants.advertisingPolicy })
      .from(tenants)
      .where(eq(tenants.tenantId, ctx.tenantId))
      .limit(1);

    const advertisingPoliciesText = tenantRows.length > 0
      ? buildAdvertisingPoliciesText(tenantRows[0].advertisingPolicy)
      : undefined;

    const response: ListAuthorizedPropertiesResponse = {
      publisher_domains: publisherDomains,
    };

    if (advertisingPoliciesText) {
      response.advertising_policies = advertisingPoliciesText;
    }

    if (request?.context != null) {
      response.context = request.context;
    }

    // Audit log success (best-effort, non-throwing)
    await db.insert(auditLogs).values({
      tenantId: ctx.tenantId,
      operation: "list_authorized_properties",
      principalName: principalId,
      principalId,
      adapterId: "mcp_server",
      success: true,
      details: {
        publisher_count: publisherDomains.length,
        publisher_domains: publisherDomains,
      },
    }).catch(() => undefined);

    return response;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    // Audit log failure (best-effort, non-throwing)
    await db.insert(auditLogs).values({
      tenantId: ctx.tenantId,
      operation: "list_authorized_properties",
      principalName: principalId,
      principalId,
      adapterId: "mcp_server",
      success: false,
      errorMessage: errorMsg,
    }).catch(() => undefined);

    throw new Error(`PROPERTIES_ERROR: Failed to list authorized properties: ${errorMsg}`);
  }
}
