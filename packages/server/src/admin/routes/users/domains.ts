import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { tenants } from "../../../db/schema/tenants.js";
import { requireTenantAccess } from "../../services/authGuard.js";

function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase();
}

function isValidDomainFormat(domain: string): boolean {
  return domain.length > 0 && domain.includes(".") && !domain.startsWith(".") && !domain.endsWith(".");
}

const domainsRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post("/tenant/:id/users/domains", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    request.auditOperation = "add_domain";

    const body = (request.body ?? {}) as Record<string, unknown>;
    const domain = normalizeDomain(typeof body.domain === "string" ? body.domain : "");

    if (!domain) return reply.code(400).send({ success: false, error: "Domain is required" });
    if (!isValidDomainFormat(domain)) {
      return reply.code(400).send({ success: false, error: "Invalid domain format" });
    }

    const [tenant] = await db
      .select({ tenantId: tenants.tenantId, authorizedDomains: tenants.authorizedDomains })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);

    if (!tenant) return reply.code(404).send({ success: false, error: "Tenant not found" });

    const domains = Array.isArray(tenant.authorizedDomains) ? [...tenant.authorizedDomains] : [];
    if (domains.includes(domain)) {
      return reply.code(400).send({ success: false, error: "Domain already exists" });
    }

    domains.push(domain);
    await db
      .update(tenants)
      .set({ authorizedDomains: domains, updatedAt: new Date() })
      .where(eq(tenants.tenantId, id));

    request.auditDetails = { domain };

    return reply.send({ success: true, domain });
  });

  fastify.delete("/tenant/:id/users/domains", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    request.auditOperation = "remove_domain";

    const body = (request.body ?? {}) as Record<string, unknown>;
    const domain = normalizeDomain(typeof body.domain === "string" ? body.domain : "");

    if (!domain) return reply.code(400).send({ success: false, error: "Domain is required" });

    const [tenant] = await db
      .select({ tenantId: tenants.tenantId, authorizedDomains: tenants.authorizedDomains })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);

    if (!tenant) return reply.code(404).send({ success: false, error: "Tenant not found" });

    const domains = Array.isArray(tenant.authorizedDomains) ? [...tenant.authorizedDomains] : [];
    const idx = domains.indexOf(domain);
    if (idx !== -1) {
      domains.splice(idx, 1);
      await db
        .update(tenants)
        .set({ authorizedDomains: domains, updatedAt: new Date() })
        .where(eq(tenants.tenantId, id));
    }

    request.auditDetails = { domain };

    return reply.send({ success: true, domain });
  });
};

export default domainsRoute;
