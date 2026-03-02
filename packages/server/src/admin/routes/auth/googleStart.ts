import { randomUUID } from "node:crypto";

import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from "fastify";

import { clearAdminSession, getAdminSession, setAdminSessionValue } from "../../services/sessionService.js";

function isOAuthConfigured(): boolean {
  return (
    (!!process.env["OAUTH_CLIENT_ID"] &&
      !!process.env["OAUTH_CLIENT_SECRET"] &&
      !!process.env["OAUTH_DISCOVERY_URL"]) ||
    (!!process.env["GOOGLE_CLIENT_ID"] && !!process.env["GOOGLE_CLIENT_SECRET"])
  );
}

function resolveBaseUrl(request: FastifyRequest): string {
  const headers = request.headers as Record<string, string | string[] | undefined>;
  const host = typeof headers["x-forwarded-host"] === "string"
    ? headers["x-forwarded-host"]
    : typeof headers.host === "string"
      ? headers.host
      : "localhost:8080";
  const proto = typeof headers["x-forwarded-proto"] === "string"
    ? headers["x-forwarded-proto"]
    : request.protocol ?? "http";
  return `${proto}://${host}`;
}

function buildGoogleAuthorizeUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
}) {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: input.state,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

const googleStartRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/auth/google", async (request, reply) => {
    if (!isOAuthConfigured()) {
      return reply.redirect("/login");
    }

    const clientId =
      process.env["OAUTH_CLIENT_ID"] ?? process.env["GOOGLE_CLIENT_ID"] ?? "";
    const redirectUri =
      process.env["GOOGLE_OAUTH_REDIRECT_URI"] ??
      `${resolveBaseUrl(request)}/auth/google/callback`;
    const state = randomUUID();

    // Preserve signup flow state across session clear (mirrors Python auth.py L448-457)
    const existingSession = getAdminSession(request);
    const signupFlow = existingSession["signup_flow"];
    const signupStep = existingSession["signup_step"];

    clearAdminSession(request);

    if (signupFlow !== undefined) setAdminSessionValue(request, "signup_flow", signupFlow);
    if (signupStep !== undefined) setAdminSessionValue(request, "signup_step", signupStep);

    setAdminSessionValue(request, "oauth_state", state);

    const url = buildGoogleAuthorizeUrl({ clientId, redirectUri, state });
    return reply.redirect(url);
  });

  fastify.get("/tenant/:tenantId/auth/google", async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    if (!isOAuthConfigured()) {
      return reply.redirect(`/tenant/${encodeURIComponent(tenantId)}/login`);
    }

    const clientId =
      process.env["OAUTH_CLIENT_ID"] ?? process.env["GOOGLE_CLIENT_ID"] ?? "";
    const redirectUri =
      process.env["GOOGLE_OAUTH_REDIRECT_URI"] ??
      `${resolveBaseUrl(request)}/auth/google/callback`;
    const state = randomUUID();

    // Store originating host for post-callback redirect construction (mirrors Python auth.py L500)
    const host = typeof request.headers.host === "string" ? request.headers.host : "";
    setAdminSessionValue(request, "oauth_originating_host", host);

    // Store Approximated.app external domain for cross-domain OAuth redirect-back (mirrors Python auth.py L507)
    const apxIncomingHost = request.headers["apx-incoming-host"];
    if (typeof apxIncomingHost === "string" && apxIncomingHost) {
      setAdminSessionValue(request, "oauth_external_domain", apxIncomingHost);
    }

    setAdminSessionValue(request, "oauth_state", state);
    setAdminSessionValue(request, "oauth_tenant_context", tenantId);

    const url = buildGoogleAuthorizeUrl({ clientId, redirectUri, state });
    return reply.redirect(url);
  });
};

export default googleStartRoute;
