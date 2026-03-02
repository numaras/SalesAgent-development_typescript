import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { tenants } from "../../../db/schema/tenants.js";
import { getAdminSession } from "../../services/sessionService.js";

const reportingRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/tenant/:id/reporting", async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = getAdminSession(request);
    if (!session.user) return reply.code(401).send({ error: "UNAUTHENTICATED" });
    if (session.role !== "super_admin" && session.tenant_id !== id) {
      return reply.code(403).send({ error: "Access denied" });
    }

    const [tenant] = await db
      .select({
        tenantId: tenants.tenantId,
        name: tenants.name,
        adServer: tenants.adServer,
        subdomain: tenants.subdomain,
        isActive: tenants.isActive,
      })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);

    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    if (tenant.adServer !== "google_ad_manager") {
      return reply.code(400).send({
        error: "GAM Reporting Not Available",
        message: `This tenant is currently using ${tenant.adServer ?? "no ad server"}. GAM Reporting is only available for tenants using Google Ad Manager.`,
        tenant_id: id,
      });
    }

    return reply.send({
      tenant_id: tenant.tenantId,
      name: tenant.name,
      ad_server: tenant.adServer,
      subdomain: tenant.subdomain,
      is_active: tenant.isActive,
      reporting_available: true,
    });
  });
};

export default reportingRoute;
