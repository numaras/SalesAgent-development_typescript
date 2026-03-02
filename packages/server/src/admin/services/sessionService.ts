/**
 * Admin session service — reads/writes the @fastify/session cookie store.
 *
 * All admin routes (login, dashboard, settings, etc.) use this service to
 * persist authenticated user data across requests via the `adcp_session`
 * HTTP-only cookie set by the session plugin registered in app.ts.
 *
 * Key fields stored in the session:
 *   user          — email address of the authenticated user
 *   user_name     — display name
 *   role          — "super_admin" | "tenant_admin" | "tenant_user"
 *   tenant_id     — active tenant (null for super-admin global context)
 *   authenticated — true when a valid session exists
 *   is_super_admin — true for super admin users
 *   signup_flow   — true when in the tenant-signup flow
 */
import type { FastifyReply, FastifyRequest } from "fastify";

export interface AdminSessionData {
  user?: string;
  user_name?: string;
  role?: string;
  tenant_id?: string;
  authenticated?: boolean;
  is_super_admin?: boolean;
  signup_flow?: boolean;
  login_next_url?: string;
  [key: string]: unknown;
}

function getSessionObj(request: FastifyRequest): Record<string, unknown> {
  return request.session as unknown as Record<string, unknown>;
}

export function getAdminSession(request: FastifyRequest): AdminSessionData {
  const s = getSessionObj(request);
  return { ...s } as AdminSessionData;
}

export function setAdminSessionValue(
  request: FastifyRequest,
  key: string,
  value: unknown,
): void {
  getSessionObj(request)[key] = value;
}

export function setAuthSession(
  request: FastifyRequest,
  data: Pick<AdminSessionData, "user" | "role" | "tenant_id" | "signup_flow">,
): void {
  const s = getSessionObj(request);
  s["user"] = data.user;
  s["role"] = data.role;
  s["tenant_id"] = data.tenant_id;
  s["signup_flow"] = data.signup_flow;
}

export function clearAdminSession(request: FastifyRequest): void {
  void (request.session as unknown as { destroy: () => void }).destroy();
}

export function redirectToNextOrDefault(
  request: FastifyRequest,
  reply: FastifyReply,
  fallbackPath: string,
): FastifyReply {
  const s = getSessionObj(request);
  const next = typeof s["login_next_url"] === "string" ? s["login_next_url"] : null;
  if (next && next.trim()) {
    delete s["login_next_url"];
    return reply.redirect(next);
  }
  return reply.redirect(fallbackPath);
}
