/**
 * Auth guard utilities mirroring Python's @require_tenant_access(api_mode=True) decorator
 * and is_super_admin() helper (admin/utils/helpers.py).
 */
import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";

import { db } from "../../db/client.js";
import { tenants } from "../../db/schema/tenants.js";
import { users } from "../../db/schema/users.js";
import { getAdminSession } from "./sessionService.js";

function parseCsvEnv(name: string): string[] {
  const value = process.env[name];
  if (!value) return [];
  return value
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
}

/**
 * Mirrors Python is_super_admin() — env-only check (no DB fallback needed for guards).
 */
export function isSuperAdmin(email: string): boolean {
  const normalized = email.toLowerCase();
  if (!normalized) return false;
  const superAdminEmails = parseCsvEnv("SUPER_ADMIN_EMAILS");
  if (superAdminEmails.includes(normalized)) return true;
  const domain = normalized.includes("@") ? normalized.split("@")[1] : "";
  const superAdminDomains = parseCsvEnv("SUPER_ADMIN_DOMAINS");
  return !!domain && superAdminDomains.includes(domain);
}

/**
 * Mirrors Python's @require_tenant_access(api_mode=True) decorator.
 *
 * Returns true if the caller has access to the given tenant.
 * Sends a 401 or 403 JSON response and returns false when access is denied —
 * the caller must return immediately after receiving false.
 *
 * Access is granted when:
 *   - Test mode is active (env ADCP_AUTH_TEST_MODE or per-tenant authSetupMode)
 *     AND session.test_user matches tenantId or is super_admin
 *   - OR session.user is a super admin (SUPER_ADMIN_EMAILS / SUPER_ADMIN_DOMAINS)
 *   - OR session.user has an active User record for this tenant in the DB
 */
export async function requireTenantAccess(
  request: FastifyRequest,
  reply: FastifyReply,
  tenantId: string,
): Promise<boolean> {
  const session = getAdminSession(request);

  // Test mode: global env OR per-tenant authSetupMode DB flag
  const testModeEnv =
    process.env["ADCP_AUTH_TEST_MODE"]?.toLowerCase() === "true";

  if (session.test_user) {
    let testMode = testModeEnv;
    if (!testMode) {
      const [tenantRow] = await db
        .select({ authSetupMode: tenants.authSetupMode })
        .from(tenants)
        .where(eq(tenants.tenantId, tenantId))
        .limit(1);
      testMode = Boolean(tenantRow?.authSetupMode);
    }
    if (testMode) {
      const testTenantId =
        typeof session.test_tenant_id === "string"
          ? session.test_tenant_id
          : null;
      if (
        testTenantId === tenantId ||
        session.test_user_role === "super_admin"
      ) {
        return true;
      }
    }
  }

  if (!session.user) {
    await reply.code(401).send({ error: "Authentication required" });
    return false;
  }

  const email =
    typeof session.user === "string" ? session.user.toLowerCase() : "";

  if (isSuperAdmin(email)) {
    return true;
  }

  const [userRow] = await db
    .select({ userId: users.userId })
    .from(users)
    .where(
      and(
        eq(users.email, email),
        eq(users.tenantId, tenantId),
        eq(users.isActive, true),
      ),
    )
    .limit(1);

  if (!userRow) {
    await reply.code(403).send({ error: "Access denied" });
    return false;
  }

  return true;
}
