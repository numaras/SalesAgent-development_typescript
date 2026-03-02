import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { randomUUID } from "node:crypto";

import { db } from "../../../db/client.js";
import { tenants } from "../../../db/schema/tenants.js";
import { tenantAuthConfigs, users } from "../../../db/schema/users.js";
import {
  getAdminSession,
  redirectToNextOrDefault,
  setAdminSessionValue,
} from "../../services/sessionService.js";

interface OidcDiscoveryDocument {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
}

interface OidcUserInfo {
  email: string;
  name: string;
  picture: string;
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

/**
 * Fetches the OpenID Connect discovery document and returns authorization_endpoint,
 * token_endpoint, and optionally userinfo_endpoint. Mirrors Python Authlib's automatic
 * discovery via server_metadata_url. Returns null if the discovery document cannot be
 * fetched or is missing required fields.
 */
async function fetchDiscoveryDocument(
  discoveryUrl: string,
): Promise<OidcDiscoveryDocument | null> {
  try {
    const resp = await fetch(discoveryUrl, { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) return null;
    const doc = (await resp.json()) as Record<string, unknown>;
    const authEp =
      typeof doc["authorization_endpoint"] === "string"
        ? doc["authorization_endpoint"]
        : null;
    const tokenEp =
      typeof doc["token_endpoint"] === "string" ? doc["token_endpoint"] : null;
    if (!authEp || !tokenEp) return null;
    return {
      authorization_endpoint: authEp,
      token_endpoint: tokenEp,
      userinfo_endpoint:
        typeof doc["userinfo_endpoint"] === "string"
          ? doc["userinfo_endpoint"]
          : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Decodes the payload of a JWT without signature verification.
 * Mirrors Python: jwt.decode(id_token, options={"verify_signature": False})
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = Buffer.from(parts[1]!, "base64url").toString("utf-8");
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Extracts user info from an OIDC token response.
 * Mirrors Python oidc.py extract_user_info() with full provider support:
 * Google, Azure AD (preferred_username/upn), generic OIDC (given_name+family_name).
 */
function extractUserInfo(tokenResponse: Record<string, unknown>): OidcUserInfo | null {
  let claims: Record<string, unknown> | null = null;

  if (tokenResponse["userinfo"] && typeof tokenResponse["userinfo"] === "object") {
    claims = tokenResponse["userinfo"] as Record<string, unknown>;
  } else if (typeof tokenResponse["id_token"] === "string") {
    claims = decodeJwtPayload(tokenResponse["id_token"]);
  }

  if (!claims) return null;

  const email =
    (typeof claims["email"] === "string" && claims["email"]) ||
    (typeof claims["preferred_username"] === "string" && claims["preferred_username"]) ||
    (typeof claims["upn"] === "string" && claims["upn"]) ||
    (typeof claims["sub"] === "string" && claims["sub"]) ||
    null;

  if (!email) return null;

  let name = "";
  if (typeof claims["name"] === "string" && claims["name"]) {
    name = claims["name"];
  } else if (typeof claims["display_name"] === "string" && claims["display_name"]) {
    name = claims["display_name"];
  } else {
    const given = typeof claims["given_name"] === "string" ? claims["given_name"] : "";
    const family =
      typeof claims["family_name"] === "string" ? claims["family_name"] : "";
    if (given || family) name = `${given} ${family}`.trim();
  }
  if (!name) name = email.split("@")[0] ?? email;

  const picture =
    (typeof claims["picture"] === "string" && claims["picture"]) ||
    (typeof claims["avatar_url"] === "string" && claims["avatar_url"]) ||
    "";

  return { email: email.toLowerCase(), name, picture };
}

const oidcFlowRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/auth/oidc/test/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const [tenant] = await db
      .select({
        tenantId: tenants.tenantId,
        subdomain: tenants.subdomain,
        virtualHost: tenants.virtualHost,
      })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);
    if (!tenant) {
      return reply.redirect("/login");
    }

    const [config] = await db
      .select()
      .from(tenantAuthConfigs)
      .where(eq(tenantAuthConfigs.tenantId, id))
      .limit(1);
    if (!config?.oidcClientId || !config.oidcDiscoveryUrl) {
      return reply.redirect(`/tenant/${encodeURIComponent(id)}/settings`);
    }

    const headers = request.headers as Record<string, string | string[] | undefined>;
    const baseUrl = resolveBaseUrl(headers);

    const discovery = await fetchDiscoveryDocument(config.oidcDiscoveryUrl);
    if (!discovery) {
      return reply.redirect(`/tenant/${encodeURIComponent(id)}/settings`);
    }

    const redirectUri = `${baseUrl}/auth/oidc/callback`;

    setAdminSessionValue(request, "oidc_test_flow", true);
    setAdminSessionValue(request, "oidc_test_tenant_id", id);

    const params = new URLSearchParams({
      client_id: config.oidcClientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: config.oidcScopes ?? "openid email profile",
      state: `test:${id}`,
    });
    return reply.redirect(`${discovery.authorization_endpoint}?${params.toString()}`);
  });

  fastify.get("/auth/oidc/login/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const [tenant] = await db
      .select({
        tenantId: tenants.tenantId,
        authSetupMode: tenants.authSetupMode,
      })
      .from(tenants)
      .where(and(eq(tenants.tenantId, id), eq(tenants.isActive, true)))
      .limit(1);
    if (!tenant) {
      return reply.redirect("/login");
    }

    const [config] = await db
      .select()
      .from(tenantAuthConfigs)
      .where(eq(tenantAuthConfigs.tenantId, id))
      .limit(1);
    const oidcAvailable = Boolean(config?.oidcClientId && config?.oidcDiscoveryUrl);
    if (!oidcAvailable) {
      return reply.redirect("/login");
    }
    if (!tenant.authSetupMode && !config?.oidcEnabled) {
      return reply.redirect("/login");
    }

    const discovery = await fetchDiscoveryDocument(config.oidcDiscoveryUrl ?? "");
    if (!discovery) {
      return reply.redirect("/login");
    }

    const headers = request.headers as Record<string, string | string[] | undefined>;
    const redirectUri = `${resolveBaseUrl(headers)}/auth/oidc/callback`;

    setAdminSessionValue(request, "oidc_login_tenant_id", id);

    const params = new URLSearchParams({
      client_id: config.oidcClientId ?? "",
      redirect_uri: redirectUri,
      response_type: "code",
      scope: config.oidcScopes ?? "openid email profile",
      state: `login:${id}`,
    });
    return reply.redirect(`${discovery.authorization_endpoint}?${params.toString()}`);
  });

  fastify.get("/auth/oidc/callback", async (request, reply) => {
    const session = getAdminSession(request);
    const isTest = Boolean(session.oidc_test_flow);
    const tenantId =
      (typeof session.oidc_test_tenant_id === "string" && session.oidc_test_tenant_id) ||
      (typeof session.oidc_login_tenant_id === "string" && session.oidc_login_tenant_id) ||
      null;

    setAdminSessionValue(request, "oidc_test_flow", undefined);
    setAdminSessionValue(request, "oidc_test_tenant_id", undefined);
    setAdminSessionValue(request, "oidc_login_tenant_id", undefined);

    if (!tenantId) {
      return reply.redirect("/login");
    }

    const query = (request.query ?? {}) as Record<string, unknown>;
    if (typeof query.error === "string" && query.error.trim()) {
      if (isTest) {
        return reply.redirect(`/tenant/${encodeURIComponent(tenantId)}/settings`);
      }
      return reply.redirect("/login");
    }

    const [tenant] = await db
      .select({
        tenantId: tenants.tenantId,
        authorizedDomains: tenants.authorizedDomains,
      })
      .from(tenants)
      .where(eq(tenants.tenantId, tenantId))
      .limit(1);
    if (!tenant) {
      return reply.redirect("/login");
    }

    const [config] = await db
      .select()
      .from(tenantAuthConfigs)
      .where(eq(tenantAuthConfigs.tenantId, tenantId))
      .limit(1);
    if (
      !config?.oidcClientId ||
      !config.oidcDiscoveryUrl ||
      !config.oidcClientSecretEncrypted
    ) {
      if (isTest) {
        return reply.redirect(`/tenant/${encodeURIComponent(tenantId)}/settings`);
      }
      return reply.redirect("/login");
    }

    const discovery = await fetchDiscoveryDocument(config.oidcDiscoveryUrl);
    if (!discovery) {
      fastify.log.error(
        { tenantId },
        "OIDC callback: could not fetch discovery document",
      );
      if (isTest) {
        return reply.redirect(`/tenant/${encodeURIComponent(tenantId)}/settings`);
      }
      return reply.redirect("/login");
    }

    const code = typeof query.code === "string" ? query.code : null;
    if (!code) {
      if (isTest) {
        return reply.redirect(`/tenant/${encodeURIComponent(tenantId)}/settings`);
      }
      return reply.redirect("/login");
    }

    const headers = request.headers as Record<string, string | string[] | undefined>;
    const redirectUri = `${resolveBaseUrl(headers)}/auth/oidc/callback`;

    let tokenResponse: Record<string, unknown>;
    try {
      const tokenBody = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: config.oidcClientId,
        client_secret: config.oidcClientSecretEncrypted,
      });
      const tokenResp = await fetch(discovery.token_endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: tokenBody.toString(),
        signal: AbortSignal.timeout(10000),
      });
      if (!tokenResp.ok) {
        throw new Error(`Token exchange HTTP ${tokenResp.status}`);
      }
      tokenResponse = (await tokenResp.json()) as Record<string, unknown>;
    } catch (err) {
      fastify.log.error({ err, tenantId }, "OIDC token exchange failed");
      if (isTest) {
        return reply.redirect(`/tenant/${encodeURIComponent(tenantId)}/settings`);
      }
      return reply.redirect("/login");
    }

    // If neither userinfo nor id_token is present, try the userinfo endpoint with the access_token
    if (!tokenResponse["userinfo"] && !tokenResponse["id_token"] && discovery.userinfo_endpoint) {
      try {
        const accessToken =
          typeof tokenResponse["access_token"] === "string"
            ? tokenResponse["access_token"]
            : null;
        if (accessToken) {
          const uiResp = await fetch(discovery.userinfo_endpoint, {
            headers: { Authorization: `Bearer ${accessToken}` },
            signal: AbortSignal.timeout(5000),
          });
          if (uiResp.ok) {
            tokenResponse["userinfo"] = await uiResp.json();
          }
        }
      } catch {
        // best-effort; fall through to extractUserInfo which tries id_token
      }
    }

    const userInfo = extractUserInfo(tokenResponse);
    if (!userInfo?.email) {
      fastify.log.error(
        { tenantId },
        "OIDC callback: could not extract email from token claims",
      );
      if (isTest) {
        return reply.redirect(`/tenant/${encodeURIComponent(tenantId)}/settings`);
      }
      return reply.redirect("/login");
    }

    const { email, name: ssoName } = userInfo;

    if (isTest) {
      const verifiedRedirectUri = `${resolveBaseUrl(headers)}/auth/oidc/callback`;
      await db
        .update(tenantAuthConfigs)
        .set({
          oidcVerifiedAt: new Date(),
          oidcVerifiedRedirectUri: verifiedRedirectUri,
          oidcEnabled: true,
          updatedAt: new Date(),
        })
        .where(eq(tenantAuthConfigs.tenantId, tenantId));

      return reply.send({
        success: true,
        tenant_id: tenantId,
        email,
      });
    }

    let [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.email, email)))
      .limit(1);

    if (!user) {
      const emailDomain = email.includes("@") ? (email.split("@")[1] ?? "") : "";
      const authorizedDomains = tenant.authorizedDomains ?? [];
      if (!emailDomain || !authorizedDomains.includes(emailDomain)) {
        return reply.redirect("/login");
      }

      const newUserId = randomUUID();
      await db.insert(users).values({
        userId: newUserId,
        tenantId,
        email,
        name: ssoName,
        role: "admin",
        isActive: true,
      });

      [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.tenantId, tenantId), eq(users.userId, newUserId)))
        .limit(1);
    }

    if (!user || !user.isActive) {
      return reply.redirect("/login");
    }

    // Update name from SSO if provider returned a different name (mirrors Python oidc.py L349-352)
    if (ssoName && ssoName !== user.name) {
      await db
        .update(users)
        .set({ name: ssoName })
        .where(and(eq(users.tenantId, tenantId), eq(users.userId, user.userId)));
    }

    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(and(eq(users.tenantId, tenantId), eq(users.userId, user.userId)));

    setAdminSessionValue(request, "user", user.email);
    setAdminSessionValue(request, "user_name", ssoName || user.name || user.email);
    setAdminSessionValue(request, "tenant_id", tenantId);
    setAdminSessionValue(request, "authenticated", true);
    setAdminSessionValue(request, "auth_method", "oidc");

    return redirectToNextOrDefault(
      request,
      reply,
      `/tenant/${encodeURIComponent(tenantId)}/dashboard`,
    );
  });
};

export default oidcFlowRoute;
