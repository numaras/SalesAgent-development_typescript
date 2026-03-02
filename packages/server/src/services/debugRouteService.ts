import { eq } from "drizzle-orm";

import { db } from "../db/client.js";
import { principals } from "../db/schema/principals.js";
import { products } from "../db/schema/products.js";
import { tenants } from "../db/schema/tenants.js";
import {
  EXCLUDED_SUBDOMAINS,
  type HeaderBag,
} from "../auth/resolveTenantFromHost.js";
import {
  validateActiveTenantBySubdomain,
  validateActiveTenantByVirtualHost,
} from "../auth/validateActiveTenant.js";

export function pickHeader(
  headers: HeaderBag,
  ...names: string[]
): string | null {
  for (const name of names) {
    const val = headers[name.toLowerCase()];
    if (!val) continue;
    const s = Array.isArray(val) ? val[0] ?? null : val;
    if (s != null && s !== "") return s;
  }
  return null;
}

export async function getDebugDbStatePayload(): Promise<{
  total_products: number;
  principal: { principal_id: string; tenant_id: string } | null;
  tenant: { tenant_id: string; name: string; is_active: boolean } | null;
  tenant_products_count: number;
  tenant_product_ids: string[];
}> {
  const allProducts = await db.select().from(products);
  const principal = await db
    .select()
    .from(principals)
    .where(eq(principals.accessToken, "ci-test-token"))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  let principalInfo: { principal_id: string; tenant_id: string } | null = null;
  let tenantInfo: { tenant_id: string; name: string; is_active: boolean } | null = null;
  let tenantProducts: { productId: string }[] = [];

  if (principal) {
    principalInfo = {
      principal_id: principal.principalId,
      tenant_id: principal.tenantId,
    };

    const tenant = await db
      .select()
      .from(tenants)
      .where(eq(tenants.tenantId, principal.tenantId))
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (tenant) {
      tenantInfo = {
        tenant_id: tenant.tenantId,
        name: tenant.name,
        is_active: tenant.isActive,
      };
    }

    tenantProducts = await db
      .select({ productId: products.productId })
      .from(products)
      .where(eq(products.tenantId, principal.tenantId));
  }

  return {
    total_products: allProducts.length,
    principal: principalInfo,
    tenant: tenantInfo,
    tenant_products_count: tenantProducts.length,
    tenant_product_ids: tenantProducts.map((p) => p.productId),
  };
}

export async function resolveTenantDebugPayload(headers: HeaderBag): Promise<{
  tenant_id: string | null;
  tenant_name: string | null;
  detection_method: string | null;
  apx_incoming_host: string | null;
  host: string | null;
}> {
  const apxHost = pickHeader(headers, "apx-incoming-host", "Apx-Incoming-Host");
  const hostHeader = pickHeader(headers, "host", "Host");

  let tenantId: string | null = null;
  let tenantName: string | null = null;
  let detectionMethod: string | null = null;

  if (apxHost) {
    const tenant = await validateActiveTenantByVirtualHost(apxHost);
    if (tenant) {
      tenantId = tenant.tenantId;
      tenantName = tenant.name;
      detectionMethod = "apx-incoming-host";
    }
  }

  if (!tenantId && hostHeader && hostHeader.includes(".")) {
    const subdomain = hostHeader.split(".")[0] ?? "";
    if (
      subdomain &&
      !EXCLUDED_SUBDOMAINS.has(subdomain) &&
      subdomain !== "sales-agent"
    ) {
      const tenant = await validateActiveTenantBySubdomain(subdomain);
      if (tenant) {
        tenantId = tenant.tenantId;
        tenantName = tenant.name;
        detectionMethod = "host-subdomain";
      }
    }
  }

  return {
    tenant_id: tenantId,
    tenant_name: tenantName,
    detection_method: detectionMethod,
    apx_incoming_host: apxHost ?? null,
    host: hostHeader ?? null,
  };
}

export async function resolveRootDebugPayload(
  headers: HeaderBag,
): Promise<Record<string, unknown>> {
  const apxHost = pickHeader(headers, "apx-incoming-host", "Apx-Incoming-Host");
  const hostHeader = pickHeader(headers, "host", "Host");
  const virtualHost = apxHost ?? hostHeader ?? null;

  const tenant = virtualHost
    ? await validateActiveTenantByVirtualHost(virtualHost)
    : null;

  const payload: Record<string, unknown> = {
    all_headers: Object.fromEntries(
      Object.entries(headers).filter(
        ([, v]) => v !== undefined && v !== null,
      ) as [string, string | string[]][],
    ),
    apx_host: apxHost ?? null,
    host_header: hostHeader ?? null,
    virtual_host: virtualHost,
    tenant_found: tenant != null,
    tenant_id: tenant?.tenantId ?? null,
    tenant_name: tenant?.name ?? null,
  };

  if (tenant) {
    payload["landing_page_generated"] = false;
    payload["landing_page_length"] = 0;
  }

  return payload;
}

export async function resolveLandingDebugPayload(
  headers: HeaderBag,
): Promise<string | null> {
  const apxHost = pickHeader(headers, "apx-incoming-host", "Apx-Incoming-Host");
  const hostHeader = pickHeader(headers, "host", "Host");
  const virtualHost = apxHost ?? hostHeader ?? null;

  if (!virtualHost) return null;

  const tenant = await validateActiveTenantByVirtualHost(virtualHost);
  if (!tenant) return null;

  return `<!DOCTYPE html><html><head><title>${tenant.name}</title></head><body><h1>${tenant.name}</h1><p>Landing placeholder (TS)</p></body></html>`;
}

export async function resolveRootLogicDebugPayload(
  headers: HeaderBag,
): Promise<Record<string, unknown>> {
  const apxHost = pickHeader(headers, "apx-incoming-host", "Apx-Incoming-Host");
  const hostHeader = pickHeader(headers, "host", "Host");
  const virtualHost = apxHost ?? hostHeader ?? null;

  const payload: Record<string, unknown> = {
    step: virtualHost ? "virtual_host_found" : "no_virtual_host",
    virtual_host: virtualHost ?? null,
    apx_host: apxHost ?? null,
    host_header: hostHeader ?? null,
    would_return: virtualHost ? undefined : "redirect to /admin/",
  };

  if (virtualHost) {
    const tenant = await validateActiveTenantByVirtualHost(virtualHost);
    payload["exact_tenant_lookup"] = tenant != null;
    if (tenant) {
      payload["step"] = "landing_page_success";
      payload["tenant_id"] = tenant.tenantId;
      payload["tenant_name"] = tenant.name;
      payload["landing_page_length"] = 0;
      payload["would_return"] = "HTMLResponse";
    } else {
      payload["step"] = "no_tenant_found";
      payload["would_return"] = "redirect to /admin/";
    }
  }

  return payload;
}
