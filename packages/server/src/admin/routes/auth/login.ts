import { and, eq, ne } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { tenantAuthConfigs } from "../../../db/schema/users.js";
import { tenants } from "../../../db/schema/tenants.js";
import { getAdminSession } from "../../services/sessionService.js";

const EXCLUDED_SUBDOMAINS = new Set([
  "localhost",
  "adcp-sales-agent",
  "www",
  "admin",
]);

function isOAuthConfigured(): boolean {
  const hasGenericOidc =
    !!process.env["OAUTH_DISCOVERY_URL"] &&
    !!process.env["OAUTH_CLIENT_ID"] &&
    !!process.env["OAUTH_CLIENT_SECRET"];
  const hasGoogleLegacy =
    !!process.env["GOOGLE_CLIENT_ID"] && !!process.env["GOOGLE_CLIENT_SECRET"];
  return hasGenericOidc || hasGoogleLegacy;
}

function isTestModeEnabled(): boolean {
  return process.env["ADCP_AUTH_TEST_MODE"]?.toLowerCase() === "true";
}

function isSingleTenantMode(): boolean {
  return process.env["SINGLE_TENANT_MODE"]?.toLowerCase() === "true";
}

function extractSubdomain(hostHeader: string): string | null {
  const host = hostHeader.split(":")[0] ?? "";
  if (!host.includes(".")) return null;
  const subdomain = host.split(".")[0] ?? "";
  if (!subdomain || EXCLUDED_SUBDOMAINS.has(subdomain.toLowerCase())) {
    return null;
  }
  return subdomain;
}

export async function detectTenantFromHeaders(headers: Record<string, unknown>): Promise<string | null> {
  const apxIncomingHost =
    typeof headers["apx-incoming-host"] === "string"
      ? headers["apx-incoming-host"]
      : null;
  if (apxIncomingHost) {
    const [row] = await db
      .select({ tenantId: tenants.tenantId })
      .from(tenants)
      .where(and(eq(tenants.virtualHost, apxIncomingHost), eq(tenants.isActive, true)))
      .limit(1);
    if (row) return row.tenantId;
  }

  const host = typeof headers.host === "string" ? headers.host : "";
  const subdomain = extractSubdomain(host);
  if (!subdomain) return null;

  const [row] = await db
    .select({ tenantId: tenants.tenantId })
    .from(tenants)
    .where(and(eq(tenants.subdomain, subdomain), eq(tenants.isActive, true), ne(tenants.tenantId, "")))
    .limit(1);
  return row?.tenantId ?? null;
}

interface LoginContext {
  test_mode: boolean;
  oauth_configured: boolean;
  oidc_enabled: boolean;
  single_tenant_mode: boolean;
  tenant_context: string | null;
  tenant_id: string | null;
  tenant_name: string | null;
}

/**
 * Build the login page context — mirrors Python auth.py login() render_template context.
 * Used by both GET /login redirect logic and GET /api/login-context.
 */
export async function buildLoginContext(headers: Record<string, unknown>): Promise<LoginContext> {
  const oauthConfigured = isOAuthConfigured();
  let testMode = isTestModeEnabled();
  const singleTenantMode = isSingleTenantMode();

  let tenantContext: string | null = await detectTenantFromHeaders(headers);
  let tenantName: string | null = null;
  let oidcEnabled = false;

  if (tenantContext) {
    const [tenantRow] = await db
      .select({ name: tenants.name, authSetupMode: tenants.authSetupMode })
      .from(tenants)
      .where(eq(tenants.tenantId, tenantContext))
      .limit(1);
    if (tenantRow) {
      tenantName = tenantRow.name;
      if (!oauthConfigured && !testMode && tenantRow.authSetupMode) testMode = true;
    }

    const [authConfig] = await db
      .select({ oidcClientId: tenantAuthConfigs.oidcClientId, oidcEnabled: tenantAuthConfigs.oidcEnabled })
      .from(tenantAuthConfigs)
      .where(eq(tenantAuthConfigs.tenantId, tenantContext))
      .limit(1);
    if (authConfig?.oidcClientId) {
      oidcEnabled = Boolean(authConfig.oidcEnabled);
    }
  } else if (singleTenantMode) {
    const [defaultTenant] = await db
      .select({ name: tenants.name, authSetupMode: tenants.authSetupMode })
      .from(tenants)
      .where(eq(tenants.tenantId, "default"))
      .limit(1);
    if (defaultTenant) {
      tenantName = defaultTenant.name;
      if (!oauthConfigured && !testMode && defaultTenant.authSetupMode) testMode = true;
    }
    const [authConfig] = await db
      .select({ oidcEnabled: tenantAuthConfigs.oidcEnabled })
      .from(tenantAuthConfigs)
      .where(eq(tenantAuthConfigs.tenantId, "default"))
      .limit(1);
    if (authConfig?.oidcEnabled) oidcEnabled = true;
    if (!tenantContext) tenantContext = "default";
  }

  return {
    test_mode: testMode,
    oauth_configured: oauthConfigured,
    oidc_enabled: oidcEnabled,
    single_tenant_mode: singleTenantMode,
    tenant_context: tenantContext,
    tenant_id: tenantContext ?? (singleTenantMode ? "default" : null),
    tenant_name: tenantName,
  };
}

const adminLoginRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/login", async (request, reply) => {
      const query = request.query as { logged_out?: string; next?: string };
      const justLoggedOut = query.logged_out === "1";
      const next = query.next?.trim();

      const tenantId = await detectTenantFromHeaders(
        request.headers as Record<string, unknown>,
      );
      const oauthConfigured = isOAuthConfigured();
      let testMode = isTestModeEnabled();

      if (tenantId) {
        // Enable test mode for this tenant if no global OAuth and tenant has auth_setup_mode set
        if (!oauthConfigured && !testMode) {
          const [tenantRow] = await db
            .select({ authSetupMode: tenants.authSetupMode })
            .from(tenants)
            .where(eq(tenants.tenantId, tenantId))
            .limit(1);
          if (tenantRow?.authSetupMode) testMode = true;
        }

        // Check for tenant-specific OIDC configuration
        const [authConfig] = await db
          .select({ oidcClientId: tenantAuthConfigs.oidcClientId, oidcEnabled: tenantAuthConfigs.oidcEnabled })
          .from(tenantAuthConfigs)
          .where(eq(tenantAuthConfigs.tenantId, tenantId))
          .limit(1);

        if (authConfig?.oidcClientId && authConfig.oidcEnabled && !testMode && !justLoggedOut) {
          return reply.redirect(`/auth/oidc/login/${encodeURIComponent(tenantId)}`);
        }

        if (oauthConfigured && !justLoggedOut) {
          const nextPart = next ? `?next=${encodeURIComponent(next)}` : "";
          return reply.redirect(`/tenant/${encodeURIComponent(tenantId)}/login${nextPart}`);
        }
      } else if (isSingleTenantMode()) {
        // Single-tenant mode: check the default tenant's OIDC config
        const [defaultTenant] = await db
          .select({ authSetupMode: tenants.authSetupMode })
          .from(tenants)
          .where(eq(tenants.tenantId, "default"))
          .limit(1);
        if (defaultTenant && !oauthConfigured && !testMode && defaultTenant.authSetupMode) {
          testMode = true;
        }

        const [authConfig] = await db
          .select({ oidcEnabled: tenantAuthConfigs.oidcEnabled })
          .from(tenantAuthConfigs)
          .where(eq(tenantAuthConfigs.tenantId, "default"))
          .limit(1);

        if (authConfig?.oidcEnabled && !testMode && !justLoggedOut) {
          return reply.redirect("/auth/oidc/login/default");
        }
      }

      // Fall back to global OAuth if configured
      if (oauthConfigured && !justLoggedOut) {
        const nextPart = next ? `?next=${encodeURIComponent(next)}` : "";
        return reply.redirect(`/auth/google${nextPart}`);
      }

      const fallbackTarget = tenantId
        ? `/test/login?tenant_id=${encodeURIComponent(tenantId)}`
        : "/test/login";
      return reply.redirect(
        justLoggedOut ? `${fallbackTarget}${fallbackTarget.includes("?") ? "&" : "?"}logged_out=1` : fallbackTarget,
      );
    },
  );

  /**
   * GET /api/login-context — Returns login page context for the React SPA.
   * Mirrors the Python render_template("login.html", ...) context from auth.py L326-335.
   * Consumed by LoginPage.tsx to show tenant branding, OIDC button, and oauth warning.
   */
  fastify.get("/api/login-context", async (request, reply) => {
    const ctx = await buildLoginContext(request.headers as Record<string, unknown>);
    return reply.send(ctx);
  });

  /**
   * GET /api/session — Returns the current authenticated admin session for the React SPA.
   * Consumed by AuthContext.tsx on every page load to determine login state.
   * Returns 401 when no valid session exists.
   */
  fastify.get("/api/session", async (request, reply) => {
    const session = getAdminSession(request);
    if (!session.authenticated || !session.user) {
      return reply.code(401).send({ error: "Not authenticated" });
    }

    // Build list of tenants this user can access (for tenant-selector UI)
    let available_tenants: Array<{ tenant_id: string; name: string; is_admin: boolean }> = [];
    if (session.is_super_admin) {
      try {
        const allTenants = await db
          .select({ tenantId: tenants.tenantId, name: tenants.name })
          .from(tenants)
          .where(eq(tenants.isActive, true));
        available_tenants = allTenants.map((t) => ({
          tenant_id: t.tenantId,
          name: t.name ?? t.tenantId,
          is_admin: true,
        }));
      } catch {
        // DB may be temporarily unavailable — return empty list rather than failing the session call
        available_tenants = [];
      }
    }

    return reply.send({
      user: session.user,
      user_name: session.user_name ?? session.user,
      role: session.role ?? "tenant_user",
      tenant_id: session.tenant_id ?? null,
      signup_flow: session.signup_flow ?? false,
      is_super_admin: session.is_super_admin ?? false,
      available_tenants,
    });
  });
};

export default adminLoginRoute;
