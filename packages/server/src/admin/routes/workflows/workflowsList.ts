import { desc, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { auditLogs } from "../../../db/schema/auditLogs.js";
import { contexts } from "../../../db/schema/contexts.js";
import { mediaBuys } from "../../../db/schema/mediaBuys.js";
import { tenants } from "../../../db/schema/tenants.js";
import { workflowSteps } from "../../../db/schema/workflowSteps.js";
import { principals } from "../../../db/schema/principals.js";
import { requireTenantAccess } from "../../services/authGuard.js";

const workflowsListRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/tenant/:id/workflows", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const [tenant] = await db
      .select({ tenantId: tenants.tenantId, name: tenants.name })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const allSteps = await db
      .select({
        stepId: workflowSteps.stepId,
        contextId: workflowSteps.contextId,
        stepType: workflowSteps.stepType,
        toolName: workflowSteps.toolName,
        status: workflowSteps.status,
        createdAt: workflowSteps.createdAt,
        completedAt: workflowSteps.completedAt,
        assignedTo: workflowSteps.assignedTo,
        errorMessage: workflowSteps.errorMessage,
        requestData: workflowSteps.requestData,
      })
      .from(workflowSteps)
      .innerJoin(contexts, eq(workflowSteps.contextId, contexts.contextId))
      .where(eq(contexts.tenantId, id))
      .orderBy(desc(workflowSteps.createdAt));

    const pendingSteps = allSteps.filter(
      (s) => s.status === "pending_approval" || s.status === "requires_approval",
    );
    const mediaBuysList = await db
      .select()
      .from(mediaBuys)
      .where(eq(mediaBuys.tenantId, id))
      .orderBy(desc(mediaBuys.createdAt));
    const activeBuys = mediaBuysList.filter((mb) => mb.status === "active");
    const totalSpend = activeBuys.reduce(
      (sum, mb) => sum + (mb.budget != null ? Number(mb.budget) : 0),
      0,
    );
    const summary = {
      active_buys: activeBuys.length,
      pending_tasks: pendingSteps.length,
      completed_today: 0,
      total_spend: totalSpend,
    };

    const contextRows = await db
      .select({ contextId: contexts.contextId, principalId: contexts.principalId })
      .from(contexts)
      .where(eq(contexts.tenantId, id));
    const contextByCtxId = new Map(contextRows.map((r) => [r.contextId, r.principalId]));
    const principalIds = [...new Set(contextByCtxId.values())];
    const principalsList =
      principalIds.length > 0
        ? await db
            .select({ principalId: principals.principalId, name: principals.name })
            .from(principals)
            .where(eq(principals.tenantId, id))
            .then((rows) => rows.filter((r) => principalIds.includes(r.principalId)))
        : [];
    const principalNames = new Map(principalsList.map((p) => [p.principalId, p.name]));

    const workflowsList = allSteps.map((step) => {
      const principalId = contextByCtxId.get(step.contextId);
      return {
        step_id: step.stepId,
        context_id: step.contextId,
        step_type: step.stepType,
        tool_name: step.toolName,
        status: step.status,
        created_at: step.createdAt?.toISOString() ?? null,
        completed_at: step.completedAt?.toISOString() ?? null,
        principal_name: principalId ? principalNames.get(principalId) ?? "Unknown" : "Unknown",
        assigned_to: step.assignedTo,
        error_message: step.errorMessage,
        request_data: step.requestData ?? undefined,
      };
    });

    const auditLogsList = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, id))
      .orderBy(desc(auditLogs.timestamp))
      .limit(100);

    return reply.send({
      tenant_id: tenant.tenantId,
      tenant_name: tenant.name,
      summary,
      workflows: workflowsList,
      tasks: workflowsList,
      media_buys: mediaBuysList.map((mb) => ({
        ...mb,
        created_at: mb.createdAt?.toISOString() ?? null,
        updated_at: mb.updatedAt?.toISOString() ?? null,
      })),
      audit_logs: auditLogsList.map((log) => ({
        log_id: log.logId,
        tenant_id: log.tenantId,
        timestamp: log.timestamp?.toISOString() ?? null,
        operation: log.operation,
        principal_name: log.principalName,
        principal_id: log.principalId,
        adapter_id: log.adapterId,
        success: log.success,
        error_message: log.errorMessage,
        details: log.details,
      })),
    });
  });
};

export default workflowsListRoute;
