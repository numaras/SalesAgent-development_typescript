import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { tenants } from "../../../db/schema/tenants.js";
import { tenantAuthConfigs } from "../../../db/schema/users.js";
import { requireTenantAccess } from "../../services/authGuard.js";

/**
 * Compute the expected OIDC redirect URI for a tenant.
 * Mirrors Python auth_config_service.py get_tenant_redirect_uri() and
 * config.ts computeTenantRedirectUri().
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

/**
 * Mirrors Python auth_config_service.py is_oidc_config_valid():
 * checks clientId, discoveryUrl, clientSecret, verifiedAt, AND
 * that the verified redirect URI matches the tenant's current redirect URI.
 * A stale verified URI (e.g. after a domain change) blocks re-enable.
 */
function canEnableOidc(
  config: (typeof tenantAuthConfigs.$inferSelect) | undefined,
  tenant: { virtualHost: string | null; subdomain: string } | undefined,
): boolean {
  if (!config) return false;
  if (!config.oidcClientId || !config.oidcDiscoveryUrl) return false;
  if (!config.oidcClientSecretEncrypted) return false;
  if (!config.oidcVerifiedAt) return false;

  // Redirect URI must still be valid — Python is_oidc_config_valid() L248-289
  const expectedRedirectUri = computeTenantRedirectUri(tenant ?? null);
  if (
    !config.oidcVerifiedRedirectUri ||
    !expectedRedirectUri ||
    config.oidcVerifiedRedirectUri !== expectedRedirectUri
  ) {
    return false;
  }

  return true;
}

const oidcEnableDisableRoute: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  fastify.post("/auth/oidc/tenant/:id/enable", async (request, reply) => {
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

    if (!canEnableOidc(config, tenant)) {
      return reply
        .code(400)
        .send({ error: "Cannot enable OIDC. Please test the configuration first." });
    }

    await db
      .update(tenantAuthConfigs)
      .set({ oidcEnabled: true, updatedAt: new Date() })
      .where(eq(tenantAuthConfigs.tenantId, id));

    const [saved] = await db
      .select({ oidcEnabled: tenantAuthConfigs.oidcEnabled })
      .from(tenantAuthConfigs)
      .where(eq(tenantAuthConfigs.tenantId, id))
      .limit(1);

    return reply.send({
      success: true,
      message: "OIDC authentication enabled",
      oidc_enabled: Boolean(saved?.oidcEnabled),
    });
  });

  fastify.post("/auth/oidc/tenant/:id/disable", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    await db
      .update(tenantAuthConfigs)
      .set({ oidcEnabled: false, updatedAt: new Date() })
      .where(eq(tenantAuthConfigs.tenantId, id));

    return reply.send({
      success: true,
      message: "OIDC authentication disabled.",
    });
  });
};

export default oidcEnableDisableRoute;
