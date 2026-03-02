/**
 * Resolve the active tenant from HTTP request headers.
 *
 * Legacy equivalent: _legacy/src/core/auth.py → get_principal_from_context()
 *   lines 228-296 — the tenant-detection block before token validation.
 *
 * Priority chain (identical to legacy):
 *
 *   1. `Host` header → exact virtual-host match in DB
 *   2. `Host` header → first subdomain component → subdomain match in DB
 *      (skips excluded subdomains: localhost, adcp-sales-agent, www, admin)
 *   3. `x-adcp-tenant` header → subdomain match first, then direct tenant_id
 *      (set by nginx for path-based routing, e.g. /tenant/acme → x-adcp-tenant: acme)
 *   4. `Apx-Incoming-Host` header → virtual-host match
 *      (used by Approximated.app proxy for virtual-host-based SaaS deployments)
 *   5. Localhost / 127.0.0.1 / localhost.localdomain → "default" tenant
 *      (development fallback — never active in production)
 *
 * Returns the full active tenant DB row (or `null` if no tenant can be determined).
 * Callers receive the `ActiveTenant` type so they have all tenant fields without
 * a second round-trip.
 *
 * The `resolveTenantId()` convenience function returns only the string tenant ID
 * for callers that don't need the full row.
 */
import type { ActiveTenant } from "./validateActiveTenant.js";
import {
  validateActiveTenant,
  validateActiveTenantBySubdomain,
  validateActiveTenantByVirtualHost,
} from "./validateActiveTenant.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Subdomain values that are NOT tenant subdomains.
 * Matches the guard in _legacy/src/core/auth.py lines 245-248.
 */
export const EXCLUDED_SUBDOMAINS = new Set([
  "localhost",
  "adcp-sales-agent",
  "www",
  "admin",
]);

// ---------------------------------------------------------------------------
// Input type
// ---------------------------------------------------------------------------

/**
 * Minimal header bag accepted by `resolveTenantFromHeaders`.
 * Fastify lowercases all header names, so callers can pass `request.headers`
 * directly. The type accepts string arrays (e.g. multi-value headers) and
 * undefined so it's compatible with Fastify's `IncomingHttpHeaders`.
 */
export type HeaderBag = Record<string, string | string[] | undefined>;

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

function pick(headers: HeaderBag, name: string): string | null {
  const val = headers[name.toLowerCase()];
  if (!val) return null;
  return Array.isArray(val) ? (val[0] ?? null) : val;
}

/**
 * Resolve and return the full `ActiveTenant` row from request headers.
 *
 * Returns `null` when no tenant can be matched (e.g. unknown host in
 * production, or a completely missing `Host` header).
 */
export async function resolveTenantFromHeaders(
  headers: HeaderBag,
): Promise<ActiveTenant | null> {
  const host = pick(headers, "host") ?? "";
  const apxHost = pick(headers, "apx-incoming-host");
  const tenantHint = pick(headers, "x-adcp-tenant");

  // 1. Exact virtual-host match on Host header
  if (host) {
    const byVirtualHost = await validateActiveTenantByVirtualHost(host);
    if (byVirtualHost) return byVirtualHost;
  }

  // 2. Subdomain extraction from Host header
  if (host.includes(".")) {
    const subdomain = host.split(".")[0] ?? "";
    if (subdomain && !EXCLUDED_SUBDOMAINS.has(subdomain)) {
      const bySubdomain = await validateActiveTenantBySubdomain(subdomain);
      if (bySubdomain) return bySubdomain;
    }
  }

  // 3. x-adcp-tenant header (nginx path-based routing hint)
  if (tenantHint) {
    // Try as a subdomain first (most common case: nginx sends the subdomain value)
    const bySubdomainHint = await validateActiveTenantBySubdomain(tenantHint);
    if (bySubdomainHint) return bySubdomainHint;

    // Fall back: treat the hint as a direct tenant_id
    const byId = await validateActiveTenant(tenantHint);
    if (byId) return byId;
  }

  // 4. Approximated.app virtual-host header
  if (apxHost) {
    const byApxHost = await validateActiveTenantByVirtualHost(apxHost);
    if (byApxHost) return byApxHost;
  }

  // 5. Localhost dev fallback → "default" tenant
  const hostname = host.split(":")[0] ?? "";
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "localhost.localdomain"
  ) {
    const defaultTenant = await validateActiveTenantBySubdomain("default");
    if (defaultTenant) return defaultTenant;
  }

  return null;
}

/**
 * Convenience wrapper: resolve only the tenant ID string (not the full row).
 * Equivalent to `(await resolveTenantFromHeaders(headers))?.tenantId ?? null`.
 */
export async function resolveTenantId(
  headers: HeaderBag,
): Promise<string | null> {
  const tenant = await resolveTenantFromHeaders(headers);
  return tenant?.tenantId ?? null;
}
