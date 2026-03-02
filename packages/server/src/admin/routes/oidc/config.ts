import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { tenants } from "../../../db/schema/tenants.js";
import { tenantAuthConfigs } from "../../../db/schema/users.js";
import { requireTenantAccess } from "../../services/authGuard.js";
import {
  OidcConfigGetResponseSchema,
  OidcConfigInputSchema,
  OidcConfigSaveResponseSchema,
  type OidcConfigSummary,
  type OidcProvider,
} from "../../schemas/oidc.js";

const PROVIDER_DISCOVERY_URLS: Record<Exclude<OidcProvider, "custom">, string> = {
  google: "https://accounts.google.com/.well-known/openid-configuration",
  microsoft: "https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration",
};

const PROVIDER_LOGOUT_URLS: Partial<Record<OidcProvider, string>> = {
  google: "https://accounts.google.com/Logout",
  microsoft: "https://login.microsoftonline.com/common/oauth2/v2.0/logout",
};

function resolveDiscoveryUrl(provider: OidcProvider, discoveryUrl?: string): string | null {
  const normalized = discoveryUrl?.trim();
  if (normalized) return normalized;
  if (provider === "custom") return null;
  return PROVIDER_DISCOVERY_URLS[provider];
}

/**
 * Compute the OIDC redirect URI for a tenant, mirroring Python's get_tenant_redirect_uri().
 * Uses virtual_host > subdomain+SALES_AGENT_DOMAIN > PUBLIC_BASE_URL > fallback.
 */
function computeTenantRedirectUri(
  tenant: { virtualHost: string | null; subdomain: string } | null | undefined,
): string | null {
  if (!tenant) return null;
  if (tenant.virtualHost) {
    return `https://${tenant.virtualHost}/auth/oidc/callback`;
  }
  const salesAgentDomain = process.env["SALES_AGENT_DOMAIN"];
  if (tenant.subdomain && salesAgentDomain) {
    return `https://${tenant.subdomain}.${salesAgentDomain}/auth/oidc/callback`;
  }
  const publicBaseUrl = process.env["PUBLIC_BASE_URL"];
  if (publicBaseUrl) {
    return `${publicBaseUrl}/auth/oidc/callback`;
  }
  return null;
}

function toSummary(
  row: (typeof tenantAuthConfigs.$inferSelect) | null | undefined,
  tenant: { virtualHost: string | null; subdomain: string } | null | undefined,
): OidcConfigSummary {
  const redirectUri = computeTenantRedirectUri(tenant);
  const oidcVerified = Boolean(row?.oidcVerifiedAt);
  const oidcValid =
    oidcVerified &&
    Boolean(row?.oidcVerifiedRedirectUri) &&
    redirectUri !== null &&
    row?.oidcVerifiedRedirectUri === redirectUri;
  return {
    provider:
      row?.oidcProvider === "google" ||
      row?.oidcProvider === "microsoft" ||
      row?.oidcProvider === "custom"
        ? row.oidcProvider
        : undefined,
    discovery_url: row?.oidcDiscoveryUrl ?? null,
    client_id: row?.oidcClientId ?? null,
    has_client_secret: Boolean(row?.oidcClientSecretEncrypted),
    scopes: row?.oidcScopes ?? "openid email profile",
    logout_url: row?.oidcLogoutUrl ?? null,
    oidc_enabled: row?.oidcEnabled ?? false,
    oidc_configured: Boolean(row?.oidcClientId),
    oidc_valid: oidcValid,
    oidc_verified: oidcVerified,
    oidc_verified_at: row?.oidcVerifiedAt ? row.oidcVerifiedAt.toISOString() : null,
    oidc_verified_redirect_uri: row?.oidcVerifiedRedirectUri ?? null,
    redirect_uri: redirectUri,
    redirect_uri_changed: Boolean(
      row?.oidcVerifiedRedirectUri &&
        redirectUri !== null &&
        row.oidcVerifiedRedirectUri !== redirectUri,
    ),
  };
}

const oidcConfigRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/auth/oidc/tenant/:id/config", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const [[config], [tenant]] = await Promise.all([
      db
        .select()
        .from(tenantAuthConfigs)
        .where(eq(tenantAuthConfigs.tenantId, id))
        .limit(1),
      db
        .select({ virtualHost: tenants.virtualHost, subdomain: tenants.subdomain })
        .from(tenants)
        .where(eq(tenants.tenantId, id))
        .limit(1),
    ]);

    const summary = toSummary(config, tenant);
    const response = OidcConfigGetResponseSchema.parse({
      config: summary,
      ...summary,
    });
    return reply.send(response);
  });

  fastify.post("/auth/oidc/tenant/:id/config", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const parsed = OidcConfigInputSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid OIDC config payload" });
    }

    const input = parsed.data;
    const discoveryUrl = resolveDiscoveryUrl(input.provider, input.discovery_url);
    if (!discoveryUrl) {
      return reply.code(400).send({ error: "discovery_url is required for custom providers" });
    }

    const [existing] = await db
      .select()
      .from(tenantAuthConfigs)
      .where(eq(tenantAuthConfigs.tenantId, id))
      .limit(1);

    const incomingSecret = input.client_secret?.trim();
    if (!incomingSecret && !existing?.oidcClientSecretEncrypted) {
      return reply
        .code(400)
        .send({ error: "client_secret is required for new configuration" });
    }

    const settingsChanged =
      !existing ||
      existing.oidcProvider !== input.provider ||
      existing.oidcClientId !== input.client_id ||
      existing.oidcDiscoveryUrl !== discoveryUrl ||
      Boolean(incomingSecret);

    const logoutUrl = input.logout_url?.trim() || PROVIDER_LOGOUT_URLS[input.provider] || null;

    if (existing) {
      await db
        .update(tenantAuthConfigs)
        .set({
          oidcProvider: input.provider,
          oidcClientId: input.client_id,
          oidcClientSecretEncrypted:
            incomingSecret || existing.oidcClientSecretEncrypted || null,
          oidcDiscoveryUrl: discoveryUrl,
          oidcScopes: input.scopes,
          oidcLogoutUrl: logoutUrl,
          oidcVerifiedAt: settingsChanged ? null : existing.oidcVerifiedAt,
          oidcVerifiedRedirectUri: settingsChanged
            ? null
            : existing.oidcVerifiedRedirectUri,
          updatedAt: new Date(),
        })
        .where(eq(tenantAuthConfigs.tenantId, id));
    } else {
      await db.insert(tenantAuthConfigs).values({
        tenantId: id,
        oidcProvider: input.provider,
        oidcClientId: input.client_id,
        oidcClientSecretEncrypted: incomingSecret ?? null,
        oidcDiscoveryUrl: discoveryUrl,
        oidcScopes: input.scopes,
        oidcLogoutUrl: logoutUrl,
      });
    }

    const [[saved], [tenantRow]] = await Promise.all([
      db
        .select()
        .from(tenantAuthConfigs)
        .where(eq(tenantAuthConfigs.tenantId, id))
        .limit(1),
      db
        .select({ virtualHost: tenants.virtualHost, subdomain: tenants.subdomain })
        .from(tenants)
        .where(eq(tenants.tenantId, id))
        .limit(1),
    ]);
    const summary = toSummary(saved, tenantRow);

    const response = OidcConfigSaveResponseSchema.parse({
      success: true,
      message: "OIDC configuration saved. Please test the connection before enabling.",
      config: summary,
    });
    return reply.send(response);
  });
};

export default oidcConfigRoute;
