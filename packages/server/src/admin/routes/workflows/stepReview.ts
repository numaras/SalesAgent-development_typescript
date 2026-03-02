import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { contexts } from "../../../db/schema/contexts.js";
import { principals } from "../../../db/schema/principals.js";
import { workflowSteps } from "../../../db/schema/workflowSteps.js";
import { requireTenantAccess } from "../../services/authGuard.js";

const stepReviewRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/tenant/:id/workflows/:workflowId/steps/:stepId/review", async (request, reply) => {
    const { id, workflowId, stepId } = request.params as {
      id: string;
      workflowId: string;
      stepId: string;
    };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const [step] = await db
      .select()
      .from(workflowSteps)
      .innerJoin(contexts, eq(workflowSteps.contextId, contexts.contextId))
      .where(and(eq(workflowSteps.stepId, stepId), eq(contexts.tenantId, id)))
      .limit(1)
      .then((rows) => rows.map((r) => r.workflow_steps));

    if (!step) return reply.code(404).send({ error: "Workflow step not found" });

    const [context] = await db
      .select()
      .from(contexts)
      .where(eq(contexts.contextId, step.contextId))
      .limit(1);

    let principal: { principalId: string; name: string } | null = null;
    if (context?.principalId) {
      const [p] = await db
        .select({ principalId: principals.principalId, name: principals.name })
        .from(principals)
        .where(and(eq(principals.tenantId, id), eq(principals.principalId, context.principalId)))
        .limit(1);
      principal = p ?? null;
    }

    const requestData = step.requestData ?? {};
    return reply.send({
      tenant_id: id,
      workflow_id: workflowId,
      step: {
        step_id: step.stepId,
        context_id: step.contextId,
        step_type: step.stepType,
        tool_name: step.toolName,
        status: step.status,
        owner: step.owner,
        assigned_to: step.assignedTo,
        created_at: step.createdAt?.toISOString() ?? null,
        completed_at: step.completedAt?.toISOString() ?? null,
        error_message: step.errorMessage,
        request_data: step.requestData ?? undefined,
        response_data: step.responseData ?? undefined,
        comments: step.comments ?? [],
      },
      context: context
        ? {
            context_id: context.contextId,
            tenant_id: context.tenantId,
            principal_id: context.principalId,
            created_at: context.createdAt?.toISOString() ?? null,
            last_activity_at: context.lastActivityAt?.toISOString() ?? null,
          }
        : null,
      principal: principal
        ? { principal_id: principal.principalId, name: principal.name }
        : null,
      request_data: requestData,
      formatted_request: JSON.stringify(requestData, null, 2),
    });
  });
};

export default stepReviewRoute;
