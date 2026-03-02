/**
 * Database principal lookup by access token.
 *
 * Legacy equivalent: _legacy/src/core/auth.py → get_principal_from_token()
 *
 * Two lookup modes (mirrors legacy exactly):
 *
 *   1. Tenant-scoped (tenantId provided):
 *      - Search principals table WHERE access_token = token AND tenant_id = tenantId
 *      - If not found → fall through to adminTokenFallback (handled by caller)
 *      - Returns principal_id or null
 *
 *   2. Global (no tenantId):
 *      - Search principals table WHERE access_token = token (across all tenants)
 *      - Validates that the matched tenant is still active
 *      - Returns { principalId, tenantId } or null
 *
 * Security: a token belonging to an inactive tenant is silently rejected.
 */
import { eq } from "drizzle-orm";

import { db } from "../db/client.js";
import { principals } from "../db/schema/principals.js";
import { tenants } from "../db/schema/tenants.js";

export interface PrincipalLookupResult {
  principalId: string;
  tenantId: string;
}

/**
 * Tenant-scoped lookup: find a principal whose access_token matches within a
 * specific tenant. Returns only the principalId (tenant is already known).
 *
 * Does NOT check admin_token — call `checkAdminToken()` (adminTokenFallback.ts)
 * as a follow-up if this returns null.
 */
export async function lookupPrincipalByToken(
  token: string,
  tenantId: string,
): Promise<string | null> {
  const row = await db
    .select({ principalId: principals.principalId })
    .from(principals)
    .where(eq(principals.accessToken, token))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!row) return null;

  // Double-check the row belongs to the expected tenant (access_token is globally
  // unique per DB constraint, but this is a defence-in-depth guard)
  const principalRow = await db
    .select({ principalId: principals.principalId, tenantId: principals.tenantId })
    .from(principals)
    .where(eq(principals.accessToken, token))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!principalRow || principalRow.tenantId !== tenantId) return null;

  return principalRow.principalId;
}

/**
 * Global lookup: find a principal by token across ALL tenants, then verify
 * the owning tenant is still active.
 *
 * Returns { principalId, tenantId } so the caller can set tenant context,
 * or null if the token is not found / the tenant is inactive.
 */
export async function lookupPrincipalGlobal(
  token: string,
): Promise<PrincipalLookupResult | null> {
  const principalRow = await db
    .select({ principalId: principals.principalId, tenantId: principals.tenantId })
    .from(principals)
    .where(eq(principals.accessToken, token))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!principalRow) return null;

  // SECURITY: validate the tenant is still active before accepting the token
  const tenantRow = await db
    .select({ tenantId: tenants.tenantId, isActive: tenants.isActive })
    .from(tenants)
    .where(eq(tenants.tenantId, principalRow.tenantId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!tenantRow?.isActive) return null;

  return { principalId: principalRow.principalId, tenantId: principalRow.tenantId };
}
