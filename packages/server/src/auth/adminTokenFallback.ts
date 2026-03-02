/**
 * Admin token fallback authentication.
 *
 * Legacy equivalent: _legacy/src/core/auth.py → get_principal_from_token()
 *   lines 56-67 (admin token check inside the tenant-scoped path)
 *
 * When a token doesn't match any principal in a tenant, the legacy code also
 * checks whether the token equals `tenant.admin_token`.  If it does, a
 * synthetic principal ID `${tenantId}_admin` is returned — this gives admin UI
 * sessions access to MCP tools without needing a real Principal row.
 *
 * This module provides a single focused function for that check.
 */
import { and, eq } from "drizzle-orm";

import { db } from "../db/client.js";
import { tenants } from "../db/schema/tenants.js";

export const ADMIN_PRINCIPAL_SUFFIX = "_admin" as const;

/**
 * Check whether `token` matches the admin token of the given tenant.
 *
 * Returns `"${tenantId}_admin"` if matched, `null` otherwise.
 * Only active tenants are considered (mirrors legacy `is_active=True` guard).
 */
export async function checkAdminToken(
  token: string,
  tenantId: string,
): Promise<string | null> {
  const row = await db
    .select({ adminToken: tenants.adminToken, isActive: tenants.isActive })
    .from(tenants)
    .where(and(eq(tenants.tenantId, tenantId), eq(tenants.isActive, true)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!row?.adminToken) return null;
  if (row.adminToken !== token) return null;

  return `${tenantId}${ADMIN_PRINCIPAL_SUFFIX}`;
}

/**
 * Returns true when a principalId was produced by the admin token fallback.
 * Useful for callers that need to gate elevated operations.
 */
export function isAdminPrincipal(principalId: string): boolean {
  return principalId.endsWith(ADMIN_PRINCIPAL_SUFFIX);
}
