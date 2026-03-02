import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { adapterConfigs } from "../../../db/schema/adapterConfigs.js";
import { tenants } from "../../../db/schema/tenants.js";
import { getAdminSession, setAdminSessionValue } from "../../services/sessionService.js";

function getGamClientId(): string | null {
  return process.env["GAM_OAUTH_CLIENT_ID"] ?? null;
}

function getGamClientSecret(): string | null {
  return process.env["GAM_OAUTH_CLIENT_SECRET"] ?? null;
}

function resolveBaseUrl(headers: Record<string, string | string[] | undefined>): string {
  const host =
    typeof headers["x-forwarded-host"] === "string"
      ? headers["x-forwarded-host"]
      : typeof headers.host === "string"
        ? headers.host
        : "localhost:8080";
  const proto =
    typeof headers["x-forwarded-proto"] === "string"
      ? headers["x-forwarded-proto"]
      : "http";
  return `${proto}://${host}`;
}

const gamOauthRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/auth/gam/authorize/:tenantId", async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const [tenant] = await db
      .select({ tenantId: tenants.tenantId })
      .from(tenants)
      .where(and(eq(tenants.tenantId, tenantId), eq(tenants.isActive, true)))
      .limit(1);

    if (!tenant) {
      return reply.redirect("/login");
    }

    const clientId = getGamClientId();
    const clientSecret = getGamClientSecret();
    if (!clientId || !clientSecret) {
      return reply.redirect(`/tenant/${encodeURIComponent(tenantId)}/settings`);
    }

    const headers = request.headers as Record<string, string | string[] | undefined>;
    const callbackUri =
      process.env["PRODUCTION"]?.toLowerCase() === "true"
        ? `${process.env["PUBLIC_BASE_URL"] ?? resolveBaseUrl(headers)}/admin/auth/gam/callback`
        : `${resolveBaseUrl(headers)}/auth/gam/callback`;

    setAdminSessionValue(request, "gam_oauth_tenant_id", tenantId);
    setAdminSessionValue(request, "gam_oauth_originating_host", headers.host ?? "");
    if (typeof headers["apx-incoming-host"] === "string") {
      setAdminSessionValue(
        request,
        "gam_oauth_external_domain",
        headers["apx-incoming-host"],
      );
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUri,
      scope: "https://www.googleapis.com/auth/dfp",
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      state: tenantId,
    });
    return reply.redirect(
      `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    );
  });

  fastify.get("/auth/gam/callback", async (request, reply) => {
    const query = request.query as {
      code?: string;
      state?: string;
      error?: string;
      error_description?: string;
    };

    // Pop session values set by the authorize handler
    const session = getAdminSession(request);
    const sessionTenantId =
      typeof session.gam_oauth_tenant_id === "string"
        ? session.gam_oauth_tenant_id
        : null;
    const originatingHost =
      typeof session.gam_oauth_originating_host === "string"
        ? session.gam_oauth_originating_host
        : null;
    const externalDomain =
      typeof session.gam_oauth_external_domain === "string"
        ? session.gam_oauth_external_domain
        : null;
    setAdminSessionValue(request, "gam_oauth_tenant_id", undefined);
    setAdminSessionValue(request, "gam_oauth_originating_host", undefined);
    setAdminSessionValue(request, "gam_oauth_external_domain", undefined);

    if (query.error) {
      const tenant = sessionTenantId ?? query.state ?? "default";
      return reply.redirect(
        `/tenant/${encodeURIComponent(tenant)}/settings?oauth_error=${encodeURIComponent(query.error_description ?? query.error)}`,
      );
    }

    const code = query.code?.trim();
    const tenantId = (sessionTenantId ?? query.state)?.trim();
    if (!code || !tenantId) {
      return reply.redirect("/login?logged_out=1");
    }

    const clientId = getGamClientId();
    const clientSecret = getGamClientSecret();
    if (!clientId || !clientSecret) {
      return reply.redirect(
        `/tenant/${encodeURIComponent(tenantId)}/settings?oauth_error=missing_oauth_credentials`,
      );
    }

    // Reconstruct the same callback URI used in the authorize handler
    const headers = request.headers as Record<string, string | string[] | undefined>;
    const callbackUri =
      process.env["PRODUCTION"]?.toLowerCase() === "true"
        ? `${process.env["PUBLIC_BASE_URL"] ?? resolveBaseUrl(headers)}/admin/auth/gam/callback`
        : `${resolveBaseUrl(headers)}/auth/gam/callback`;

    // Exchange authorization code for tokens
    let tokenData: Record<string, unknown>;
    try {
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: callbackUri,
        }).toString(),
      });

      if (!tokenResponse.ok) {
        let errorDetails: Record<string, unknown> = {};
        try {
          errorDetails = (await tokenResponse.json()) as Record<string, unknown>;
        } catch {
          errorDetails = { raw: await tokenResponse.text() };
        }
        const detailsStr = JSON.stringify(errorDetails);
        let oauthError = "token_exchange_failed";
        if (detailsStr.includes("redirect_uri_mismatch")) {
          oauthError = "redirect_uri_mismatch";
        } else if (detailsStr.includes("invalid_grant")) {
          oauthError = "invalid_grant";
        } else if (detailsStr.includes("invalid_client")) {
          oauthError = "invalid_client";
        }
        return reply.redirect(
          `/tenant/${encodeURIComponent(tenantId)}/settings?oauth_error=${encodeURIComponent(oauthError)}`,
        );
      }

      tokenData = (await tokenResponse.json()) as Record<string, unknown>;
    } catch {
      return reply.redirect(
        `/tenant/${encodeURIComponent(tenantId)}/settings?oauth_error=token_exchange_failed`,
      );
    }

    const refreshToken = typeof tokenData.refresh_token === "string" ? tokenData.refresh_token : null;
    if (!refreshToken) {
      return reply.redirect(
        `/tenant/${encodeURIComponent(tenantId)}/settings?oauth_error=no_refresh_token`,
      );
    }

    // Persist refresh token and mark tenant as using Google Ad Manager
    try {
      const [existingConfig] = await db
        .select({ tenantId: adapterConfigs.tenantId })
        .from(adapterConfigs)
        .where(eq(adapterConfigs.tenantId, tenantId))
        .limit(1);

      if (existingConfig) {
        await db
          .update(adapterConfigs)
          .set({ gamRefreshToken: refreshToken, updatedAt: new Date() })
          .where(eq(adapterConfigs.tenantId, tenantId));
      } else {
        await db.insert(adapterConfigs).values({
          tenantId,
          adapterType: "google_ad_manager",
          gamRefreshToken: refreshToken,
        });
      }

      await db
        .update(tenants)
        .set({ adServer: "google_ad_manager", updatedAt: new Date() })
        .where(eq(tenants.tenantId, tenantId));
    } catch {
      return reply.redirect(
        `/tenant/${encodeURIComponent(tenantId)}/settings?oauth_error=db_write_failed`,
      );
    }

    // Redirect back to tenant settings — prefer external domain in production
    if (externalDomain && process.env["PRODUCTION"]?.toLowerCase() === "true") {
      return reply.redirect(
        `https://${externalDomain}/admin/tenant/${encodeURIComponent(tenantId)}/settings?gam_oauth=success`,
      );
    }
    if (originatingHost && process.env["PRODUCTION"]?.toLowerCase() === "true") {
      return reply.redirect(
        `https://${originatingHost}/admin/tenant/${encodeURIComponent(tenantId)}/settings?gam_oauth=success`,
      );
    }
    return reply.redirect(
      `/tenant/${encodeURIComponent(tenantId)}/settings?gam_oauth=success`,
    );
  });
};

export default gamOauthRoute;
