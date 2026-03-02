import { and, eq, inArray } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from "fastify";

import { db } from "../../../db/client.js";
import { tenants } from "../../../db/schema/tenants.js";
import { users } from "../../../db/schema/users.js";
import { isSuperAdmin } from "../../services/authGuard.js";
import {
  getAdminSession,
  redirectToNextOrDefault,
  setAdminSessionValue,
} from "../../services/sessionService.js";

interface GoogleUserInfo {
  email: string;
  name?: string;
  picture?: string;
}

interface AvailableTenant {
  tenant_id: string;
  name: string;
  subdomain: string;
  is_admin: boolean;
}

function resolveBaseUrl(request: FastifyRequest): string {
  const headers = request.headers as Record<string, string | string[] | undefined>;
  const host =
    typeof headers["x-forwarded-host"] === "string"
      ? headers["x-forwarded-host"]
      : typeof headers.host === "string"
        ? headers.host
        : "localhost:8080";
  const proto =
    typeof headers["x-forwarded-proto"] === "string"
      ? headers["x-forwarded-proto"]
      : request.protocol ?? "http";
  return `${proto}://${host}`;
}

function parseCsvEnv(name: string): string[] {
  const value = process.env[name];
  if (!value) return [];
  return value
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
}

function getSuperAdminDomain(): string | null {
  return parseCsvEnv("SUPER_ADMIN_DOMAINS")[0] ?? null;
}

/**
 * Exchange authorization code for an access token and fetch user info from Google.
 * Mirrors Python auth.py L539-573 (Authlib authorize_access_token + extract_user_info).
 */
async function exchangeCodeForUserInfo(
  code: string,
  redirectUri: string,
): Promise<GoogleUserInfo | null> {
  const clientId =
    process.env["OAUTH_CLIENT_ID"] ?? process.env["GOOGLE_CLIENT_ID"];
  const clientSecret =
    process.env["OAUTH_CLIENT_SECRET"] ?? process.env["GOOGLE_CLIENT_SECRET"];
  if (!clientId || !clientSecret) return null;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }).toString(),
  });

  if (!tokenResponse.ok) return null;

  const tokenData = (await tokenResponse.json()) as Record<string, unknown>;
  const accessToken =
    typeof tokenData.access_token === "string" ? tokenData.access_token : null;
  if (!accessToken) return null;

  const userInfoResponse = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!userInfoResponse.ok) return null;

  const info = (await userInfoResponse.json()) as Record<string, unknown>;
  const email =
    typeof info.email === "string" ? info.email.toLowerCase() : null;
  if (!email) return null;

  return {
    email,
    name: typeof info.name === "string" ? info.name : undefined,
    picture: typeof info.picture === "string" ? info.picture : undefined,
  };
}

/**
 * Get all tenant access for a user from three sources, mirroring Python
 * domain_access.py get_user_tenant_access():
 *   1. User records (primary — individual user authorization)
 *   2. authorized_domains (bulk org access)
 *   3. authorized_emails (legacy backwards compatibility)
 */
async function getUserTenantAccess(email: string): Promise<{
  userTenants: AvailableTenant[];
  domainTenant: AvailableTenant | null;
  emailTenants: AvailableTenant[];
}> {
  const emailLower = email.toLowerCase();
  const emailDomain = emailLower.includes("@") ? emailLower.split("@")[1] : "";

  // Source 1: User records
  const userRows = await db
    .select({ tenantId: users.tenantId, role: users.role })
    .from(users)
    .where(and(eq(users.email, emailLower), eq(users.isActive, true)));

  const userTenantIds = userRows.map((r) => r.tenantId);
  const userTenantRecords =
    userTenantIds.length > 0
      ? await db
          .select({
            tenantId: tenants.tenantId,
            name: tenants.name,
            subdomain: tenants.subdomain,
          })
          .from(tenants)
          .where(
            and(
              inArray(tenants.tenantId, userTenantIds),
              eq(tenants.isActive, true),
            ),
          )
      : [];

  const userTenants: AvailableTenant[] = userTenantRecords.map((t) => {
    const userRow = userRows.find((u) => u.tenantId === t.tenantId);
    return {
      tenant_id: t.tenantId,
      name: t.name,
      subdomain: t.subdomain,
      is_admin: userRow?.role === "admin",
    };
  });

  // Sources 2 + 3: scan active tenants once for domain and email lists
  const allActive = await db
    .select({
      tenantId: tenants.tenantId,
      name: tenants.name,
      subdomain: tenants.subdomain,
      authorizedDomains: tenants.authorizedDomains,
      authorizedEmails: tenants.authorizedEmails,
    })
    .from(tenants)
    .where(eq(tenants.isActive, true));

  let domainTenant: AvailableTenant | null = null;
  const emailTenants: AvailableTenant[] = [];

  for (const t of allActive) {
    // Source 2: domain match (first match wins, like Python's break)
    if (!domainTenant && emailDomain) {
      const domains = Array.isArray(t.authorizedDomains)
        ? (t.authorizedDomains as string[])
        : [];
      if (domains.includes(emailDomain)) {
        domainTenant = {
          tenant_id: t.tenantId,
          name: t.name,
          subdomain: t.subdomain,
          is_admin: true, // domain users get admin access (Python domain_access.py L644)
        };
      }
    }

    // Source 3: authorized_emails (legacy)
    const emails = Array.isArray(t.authorizedEmails)
      ? (t.authorizedEmails as string[])
      : [];
    if (emails.map((e) => e.toLowerCase()).includes(emailLower)) {
      const userRow = userRows.find((u) => u.tenantId === t.tenantId);
      emailTenants.push({
        tenant_id: t.tenantId,
        name: t.name,
        subdomain: t.subdomain,
        // Mirror Python: existing user role, else default to admin (L661)
        is_admin: userRow ? userRow.role === "admin" : true,
      });
    }
  }

  return { userTenants, domainTenant, emailTenants };
}

/**
 * Create or update user record in a tenant.
 * Mirrors Python domain_access.py ensure_user_in_tenant() and selectTenant.ts.
 */
async function ensureUserInTenant(
  email: string,
  tenantId: string,
  role: string,
  name: string,
): Promise<void> {
  const emailLower = email.toLowerCase();
  const [existing] = await db
    .select({ userId: users.userId })
    .from(users)
    .where(and(eq(users.email, emailLower), eq(users.tenantId, tenantId)))
    .limit(1);

  if (existing) {
    await db
      .update(users)
      .set({ isActive: true, lastLogin: new Date() })
      .where(and(eq(users.email, emailLower), eq(users.tenantId, tenantId)));
  } else {
    const { randomUUID } = await import("crypto");
    await db.insert(users).values({
      userId: randomUUID(),
      tenantId,
      email: emailLower,
      name:
        name ||
        email
          .split("@")[0]
          .replace(/\b\w/g, (c) => c.toUpperCase()),
      role,
      isActive: true,
      lastLogin: new Date(),
    });
  }
}

const googleCallbackRoute: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  fastify.get(
    "/auth/google/callback",
    async (request, reply) => {
      const query = request.query as Record<string, unknown>;
      const session = getAdminSession(request);

      const tenantContext =
        typeof session.oauth_tenant_context === "string"
          ? session.oauth_tenant_context
          : null;
      const storedState =
        typeof session.oauth_state === "string" ? session.oauth_state : null;
      const state =
        typeof query.state === "string" ? query.state : null;

      const fallbackRedirect = tenantContext
        ? `/tenant/${encodeURIComponent(tenantContext)}/login?logged_out=1`
        : "/login?logged_out=1";

      // OAuth error from Google
      if (typeof query.error === "string" && query.error.trim()) {
        return reply.redirect(fallbackRedirect);
      }

      // CSRF state mismatch
      if (storedState && state && storedState !== state) {
        return reply.redirect(fallbackRedirect);
      }

      const code =
        typeof query.code === "string" ? query.code.trim() : null;
      if (!code) {
        return reply.redirect(fallbackRedirect);
      }

      // Redirect URI must match the one used in googleStart.ts
      const redirectUri =
        process.env["GOOGLE_OAUTH_REDIRECT_URI"] ??
        `${resolveBaseUrl(request)}/auth/google/callback`;

      // Exchange code for user info (token exchange + userinfo fetch)
      let userInfo: GoogleUserInfo | null = null;
      try {
        userInfo = await exchangeCodeForUserInfo(code, redirectUri);
      } catch {
        return reply.redirect(fallbackRedirect);
      }

      if (!userInfo?.email) {
        return reply.redirect(fallbackRedirect);
      }

      const email = userInfo.email;
      const userName =
        userInfo.name ??
        email
          .split("@")[0]
          .replace(/\b\w/g, (c) => c.toUpperCase());

      // Store identity in session (mirrors Python auth.py L571-573)
      setAdminSessionValue(request, "user", email);
      setAdminSessionValue(request, "user_name", userName);
      setAdminSessionValue(request, "user_picture", userInfo.picture ?? "");

      // Super admin check — has priority over all other flows (Python auth.py L581-599)
      const emailDomain = email.includes("@") ? email.split("@")[1] : "";
      const superAdminDomain = getSuperAdminDomain();
      if (
        (superAdminDomain && emailDomain === superAdminDomain) ||
        isSuperAdmin(email)
      ) {
        setAdminSessionValue(request, "is_super_admin", true);
        setAdminSessionValue(request, "role", "super_admin");
        setAdminSessionValue(request, "signup_flow", undefined);
        setAdminSessionValue(request, "signup_step", undefined);
        return redirectToNextOrDefault(request, reply, "/");
      }

      // Signup flow redirect — only for non-super-admins (Python auth.py L602-605)
      if (session.signup_flow) {
        return reply.redirect("/signup/onboarding");
      }

      // Resolve all tenant access for this user (Python auth.py L609-668)
      const { userTenants, domainTenant, emailTenants } =
        await getUserTenantAccess(email);

      // Deduplicate tenants: user_tenants first, then domain_tenant, then email_tenants
      const tenantDict = new Map<string, AvailableTenant>();
      for (const t of userTenants) {
        tenantDict.set(t.tenant_id, t);
      }
      if (domainTenant && !tenantDict.has(domainTenant.tenant_id)) {
        tenantDict.set(domainTenant.tenant_id, domainTenant);
      }
      for (const t of emailTenants) {
        if (!tenantDict.has(t.tenant_id)) {
          tenantDict.set(t.tenant_id, t);
        }
      }
      const availableTenants = Array.from(tenantDict.values());
      setAdminSessionValue(request, "available_tenants", availableTenants);

      // Single-tenant mode with exactly one tenant: auto-select (Python auth.py L676-700)
      const isSingleTenantMode =
        process.env["SINGLE_TENANT_MODE"]?.toLowerCase() === "true";
      if (isSingleTenantMode && availableTenants.length === 1) {
        const tenant = availableTenants[0]!;
        const tenantId = tenant.tenant_id;
        const role = tenant.is_admin ? "admin" : "viewer";
        try {
          await ensureUserInTenant(email, tenantId, role, userName);
        } catch {
          // Non-fatal: log in production; continue with session setup
        }
        setAdminSessionValue(request, "tenant_id", tenantId);
        setAdminSessionValue(request, "role", role);
        setAdminSessionValue(request, "is_tenant_admin", tenant.is_admin);
        setAdminSessionValue(request, "available_tenants", undefined);
        return redirectToNextOrDefault(
          request,
          reply,
          `/tenant/${encodeURIComponent(tenantId)}/dashboard`,
        );
      }

      // Multi-tenant: redirect to tenant selector (Python auth.py L702-712)
      return reply.redirect("/auth/select-tenant");
    },
  );
};

export default googleCallbackRoute;
