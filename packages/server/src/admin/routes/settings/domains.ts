import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { auditLogs } from "../../../db/schema/auditLogs.js";
import { tenants } from "../../../db/schema/tenants.js";
import { requireTenantAccess } from "../../services/authGuard.js";
import { getAdminSession } from "../../services/sessionService.js";

function normalizeDomain(input: unknown): string {
  return typeof input === "string" ? input.trim().toLowerCase() : "";
}

function isValidDomain(domain: string): boolean {
  if (!domain) return false;
  if (!domain.includes(".")) return false;
  if (domain.startsWith(".") || domain.endsWith(".")) return false;
  return /^[a-z0-9.-]+$/.test(domain);
}

const domainSettingsRoute: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  fastify.post("/tenant/:id/settings/domains/add", async (request, reply) => {
    const { id } = request.params as { id: string };

    if (!(await requireTenantAccess(request, reply, id))) return;

    const session = getAdminSession(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const domain = normalizeDomain(body.domain);
    if (!isValidDomain(domain)) {
      return reply.code(400).send({ success: false, error: "Invalid domain format" });
    }

    const [tenant] = await db
      .select({
        tenantId: tenants.tenantId,
        authorizedDomains: tenants.authorizedDomains,
      })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);
    if (!tenant) {
      return reply.code(404).send({ success: false, error: "Tenant not found" });
    }

    const domains = Array.isArray(tenant.authorizedDomains)
      ? [...tenant.authorizedDomains]
      : [];
    if (domains.includes(domain)) {
      return reply.code(400).send({ success: false, error: "Domain already exists" });
    }

    domains.push(domain);
    await db
      .update(tenants)
      .set({
        authorizedDomains: domains,
        updatedAt: new Date(),
      })
      .where(eq(tenants.tenantId, id));

    const actor = typeof session.user === "string" ? session.user : "unknown";
    try {
      await db.insert(auditLogs).values({
        tenantId: id,
        operation: "add_authorized_domain",
        principalName: actor,
        adapterId: "admin_ui",
        success: true,
        details: { event_type: "add_authorized_domain", domain },
      });
    } catch { /* audit failure must not block response */ }

    return reply.send({ success: true, domain });
  });

  fastify.post("/tenant/:id/settings/domains/remove", async (request, reply) => {
    const { id } = request.params as { id: string };

    if (!(await requireTenantAccess(request, reply, id))) return;

    const session = getAdminSession(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const domain = normalizeDomain(body.domain);
    if (!domain) {
      return reply.code(400).send({ success: false, error: "Domain is required" });
    }

    const [tenant] = await db
      .select({
        tenantId: tenants.tenantId,
        authorizedDomains: tenants.authorizedDomains,
      })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);
    if (!tenant) {
      return reply.code(404).send({ success: false, error: "Tenant not found" });
    }

    const domains = Array.isArray(tenant.authorizedDomains)
      ? tenant.authorizedDomains.filter((entry) => entry !== domain)
      : [];
    await db
      .update(tenants)
      .set({
        authorizedDomains: domains,
        updatedAt: new Date(),
      })
      .where(eq(tenants.tenantId, id));

    const actor = typeof session.user === "string" ? session.user : "unknown";
    try {
      await db.insert(auditLogs).values({
        tenantId: id,
        operation: "remove_authorized_domain",
        principalName: actor,
        adapterId: "admin_ui",
        success: true,
        details: { event_type: "remove_authorized_domain", domain },
      });
    } catch { /* audit failure must not block response */ }

    return reply.send({ success: true });
  });
};

export default domainSettingsRoute;
