/**
 * Active tenant validation helper.
 *
 * Legacy equivalent: _legacy/src/core/auth.py → get_principal_from_token()
 *   lines 83-89 — checks tenant is not deleted/disabled before accepting a token.
 *
 * Also used directly by the tenant-resolution path in resolveTenantFromHost.ts
 * to gate requests to inactive tenants at the Fastify plugin level.
 *
 * Returns the full tenant row (typed select) so callers can use any field
 * without a second DB round-trip.
 */
import { and, eq } from "drizzle-orm";

import { db } from "../db/client.js";
import { tenants } from "../db/schema/tenants.js";

export type ActiveTenant = typeof tenants.$inferSelect;

/**
 * Load the tenant row for `tenantId` and verify it is active.
 *
 * @returns The tenant row, or `null` if the tenant does not exist or is inactive.
 */
export async function validateActiveTenant(
  tenantId: string,
): Promise<ActiveTenant | null> {
  const row = await db
    .select()
    .from(tenants)
    .where(and(eq(tenants.tenantId, tenantId), eq(tenants.isActive, true)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  return row ?? null;
}

/**
 * Load the tenant row by subdomain (e.g. "acme" from "acme.example.com")
 * and verify it is active.
 *
 * Legacy equivalent: _legacy/src/core/config_loader.py → get_tenant_by_subdomain()
 * (used in tenant resolution, not strictly part of auth.py but co-located here
 * because it feeds directly into the auth pipeline).
 */
export async function validateActiveTenantBySubdomain(
  subdomain: string,
): Promise<ActiveTenant | null> {
  const row = await db
    .select()
    .from(tenants)
    .where(and(eq(tenants.subdomain, subdomain), eq(tenants.isActive, true)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  return row ?? null;
}

/**
 * Load the tenant row by virtual_host (full host string, e.g. "adcp.acme.com")
 * and verify it is active.
 *
 * Legacy equivalent: _legacy/src/core/config_loader.py → get_tenant_by_virtual_host()
 */
export async function validateActiveTenantByVirtualHost(
  virtualHost: string,
): Promise<ActiveTenant | null> {
  const row = await db
    .select()
    .from(tenants)
    .where(and(eq(tenants.virtualHost, virtualHost), eq(tenants.isActive, true)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  return row ?? null;
}
