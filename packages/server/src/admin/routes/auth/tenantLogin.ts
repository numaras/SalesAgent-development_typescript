import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { tenantAuthConfigs } from "../../../db/schema/users.js";
import { tenants } from "../../../db/schema/tenants.js";

function isOAuthConfigured(): boolean {
  const hasGenericOidc =
    !!process.env["OAUTH_DISCOVERY_URL"] &&
    !!process.env["OAUTH_CLIENT_ID"] &&
    !!process.env["OAUTH_CLIENT_SECRET"];
  const hasGoogleLegacy =
    !!process.env["GOOGLE_CLIENT_ID"] && !!process.env["GOOGLE_CLIENT_SECRET"];
  return hasGenericOidc || hasGoogleLegacy;
}

function isGlobalTestModeEnabled(): boolean {
  return process.env["ADCP_AUTH_TEST_MODE"]?.toLowerCase() === "true";
}

const tenantLoginRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get(
    "/tenant/:tenantId/login",
    async (request, reply) => {
      const { tenantId } = request.params as { tenantId: string };
      const query = request.query as { logged_out?: string; next?: string };
      const justLoggedOut = query.logged_out === "1";
      const next = query.next?.trim();

      const [tenant] = await db
        .select({
          tenantId: tenants.tenantId,
          name: tenants.name,
          authSetupMode: tenants.authSetupMode,
        })
        .from(tenants)
        .where(and(eq(tenants.tenantId, tenantId), eq(tenants.isActive, true)))
        .limit(1);

      if (!tenant) {
        return reply.code(404).send({
          error: "TENANT_NOT_FOUND",
          message: `Tenant '${tenantId}' was not found.`,
        });
      }

      const oauthConfigured = isOAuthConfigured();
      const testMode =
        isGlobalTestModeEnabled() || (!oauthConfigured && tenant.authSetupMode);

      // Check if tenant has OIDC configured and enabled
      const [authConfig] = await db
        .select({ oidcClientId: tenantAuthConfigs.oidcClientId, oidcEnabled: tenantAuthConfigs.oidcEnabled })
        .from(tenantAuthConfigs)
        .where(eq(tenantAuthConfigs.tenantId, tenantId))
        .limit(1);

      const oidcEnabled = !!(authConfig?.oidcClientId && authConfig.oidcEnabled);

      // If OIDC is enabled and not in test mode and not just logged out, redirect to OIDC login
      if (oidcEnabled && !testMode && !justLoggedOut) {
        return reply.redirect(`/auth/oidc/login/${encodeURIComponent(tenantId)}`);
      }

      if (oauthConfigured && !testMode && !justLoggedOut) {
        const nextPart = next ? `&next=${encodeURIComponent(next)}` : "";
        return reply.redirect(
          `/auth/google?tenant_id=${encodeURIComponent(tenantId)}${nextPart}`,
        );
      }

      const nextPart = next ? `&next=${encodeURIComponent(next)}` : "";
      const loggedOutPart = justLoggedOut ? "&logged_out=1" : "";
      return reply.redirect(
        `/test/login?tenant_id=${encodeURIComponent(tenantId)}${loggedOutPart}${nextPart}`,
      );
    },
  );
};

export default tenantLoginRoute;
