import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { tenants } from "../../../db/schema/tenants.js";
import { getAdminSession } from "../../services/sessionService.js";

const reactivateTenantRoute: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  fastify.post("/admin/tenant/:id/reactivate", async (request, reply) => {
    const session = getAdminSession(request);
    if (session.role !== "super_admin") {
      return reply.code(403).send({
        error: "Only super admins can reactivate tenants",
      });
    }

    const { id } = request.params as { id: string };
    const [tenant] = await db
      .select({
        tenantId: tenants.tenantId,
        name: tenants.name,
        isActive: tenants.isActive,
      })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);

    if (!tenant) {
      return reply.code(404).send({ error: "Tenant not found" });
    }
    if (tenant.isActive) {
      return reply.send({
        success: true,
        message: `Tenant '${tenant.name}' is already active`,
      });
    }

    await db
      .update(tenants)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(tenants.tenantId, id));

    return reply.send({
      success: true,
      message: `Sales agent '${tenant.name}' has been reactivated successfully`,
    });
  });
};

export default reactivateTenantRoute;
