import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { auditLogs } from "../../../db/schema/auditLogs.js";
import { tenants } from "../../../db/schema/tenants.js";
import { requireTenantAccess } from "../../services/authGuard.js";
import {
  clearAdminSession,
  getAdminSession,
} from "../../services/sessionService.js";

const deactivateTenantRoute: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  fastify.post("/tenant/:id/deactivate", async (request, reply) => {
    const { id } = request.params as { id: string };

    if (!(await requireTenantAccess(request, reply, id))) return;

    const session = getAdminSession(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const confirmName =
      typeof body.confirm_name === "string" ? body.confirm_name.trim() : "";

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

    if (confirmName !== tenant.name) {
      return reply.code(400).send({
        error: "Confirmation name did not match. Deactivation cancelled.",
      });
    }

    if (!tenant.isActive) {
      return reply.send({
        success: true,
        message: "This sales agent is already deactivated.",
      });
    }

    await db
      .update(tenants)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(tenants.tenantId, id));

    const deactivatedBy =
      typeof session.user === "string" ? session.user : "unknown";

    try {
      await db.insert(auditLogs).values({
        tenantId: id,
        operation: "tenant_deactivation",
        principalName: deactivatedBy,
        adapterId: "admin_ui",
        success: true,
        details: {
          event_type: "tenant_deactivation",
          severity: "critical",
          tenant_name: tenant.name,
          deactivated_at: new Date().toISOString(),
          deactivated_by: deactivatedBy,
        },
      });
    } catch {
      /* Audit logging failure must not block deactivation */
    }

    clearAdminSession(request);

    return reply.send({
      success: true,
      message:
        `Sales agent '${tenant.name}' has been deactivated. ` +
        "All data is preserved. Contact support to reactivate.",
      redirect: "/login",
    });
  });
};

export default deactivateTenantRoute;
