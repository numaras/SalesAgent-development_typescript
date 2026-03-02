import { and, eq, inArray, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { creatives } from "../../../db/schema/creatives.js";
import { contexts } from "../../../db/schema/contexts.js";
import { mediaBuys } from "../../../db/schema/mediaBuys.js";
import { objectWorkflowMappings, workflowSteps } from "../../../db/schema/workflowSteps.js";
import { requireTenantAccess } from "../../services/authGuard.js";
import { getAdminSession } from "../../services/sessionService.js";

type Comment = { user: string; timestamp: string; comment: string };

/**
 * Mirrors Python workflows.py L198-276 — after a workflow step approval, check
 * ObjectWorkflowMapping for a linked media buy and advance its status:
 *   - "pending_approval" + unapproved creatives → "pending_creatives" (wait)
 *   - "pending_approval" + all creatives approved → "scheduled"
 * Returns true if a pending_creatives early-return should be sent to the client.
 */
async function executeApprovedMediaBuyCascade(
  tenantId: string,
  stepId: string,
  approvedByUser: string,
): Promise<boolean> {
  const [mapping] = await db
    .select()
    .from(objectWorkflowMappings)
    .where(
      and(
        eq(objectWorkflowMappings.stepId, stepId),
        eq(objectWorkflowMappings.objectType, "media_buy"),
      ),
    )
    .limit(1);

  if (!mapping) return false;

  const mediaBuyId = mapping.objectId;

  const [mediaBuy] = await db
    .select({
      mediaBuyId: mediaBuys.mediaBuyId,
      status: mediaBuys.status,
      startDate: mediaBuys.startDate,
    })
    .from(mediaBuys)
    .where(and(eq(mediaBuys.mediaBuyId, mediaBuyId), eq(mediaBuys.tenantId, tenantId)))
    .limit(1);

  if (!mediaBuy || mediaBuy.status !== "pending_approval") return false;

  // Check creative assignments for this media buy
  const assignments = (await db.execute(
    sql`SELECT creative_id FROM creative_assignments WHERE media_buy_id = ${mediaBuyId}`,
  )) as unknown as Array<{ creative_id: string }>;

  if (assignments.length > 0) {
    const creativeIds = assignments.map((a) => a.creative_id);

    const allCreatives = await db
      .select({ creativeId: creatives.creativeId, status: creatives.status })
      .from(creatives)
      .where(inArray(creatives.creativeId, creativeIds));

    const unapproved = allCreatives.filter(
      (c) => !["approved", "active"].includes(c.status),
    );

    if (unapproved.length > 0) {
      // Still waiting for creatives — flag media buy and signal early return
      await db
        .update(mediaBuys)
        .set({ status: "pending_creatives", updatedAt: new Date() })
        .where(eq(mediaBuys.mediaBuyId, mediaBuyId));
      return true;
    }
  }

  // All creatives approved (or no assignments) — advance media buy to scheduled
  await db
    .update(mediaBuys)
    .set({
      status: "scheduled",
      approvedAt: new Date(),
      approvedBy: approvedByUser,
      updatedAt: new Date(),
    })
    .where(eq(mediaBuys.mediaBuyId, mediaBuyId));

  return false;
}

const stepActionsRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post(
    "/tenant/:id/workflows/:workflowId/steps/:stepId/approve",
    async (request, reply) => {
      const { id, stepId } = request.params as { id: string; workflowId: string; stepId: string };
      if (!(await requireTenantAccess(request, reply, id))) return;

      request.auditOperation = "approve_workflow_step";

      const session = getAdminSession(request);

      const [row] = await db
        .select()
        .from(workflowSteps)
        .innerJoin(contexts, eq(workflowSteps.contextId, contexts.contextId))
        .where(and(eq(workflowSteps.stepId, stepId), eq(contexts.tenantId, id)))
        .limit(1)
        .then((rows) => rows.map((r) => r.workflow_steps));

      if (!row) return reply.code(404).send({ error: "Workflow step not found" });

      const userEmail = typeof session.user === "string" ? session.user : "system";
      const comments: Comment[] = Array.isArray(row.comments) ? [...row.comments] : [];
      comments.push({
        user: userEmail,
        timestamp: new Date().toISOString(),
        comment: "Approved via admin UI",
      });

      await db
        .update(workflowSteps)
        .set({
          status: "approved",
          completedAt: new Date(),
          comments,
        })
        .where(eq(workflowSteps.stepId, stepId));

      // Execute adapter creation cascade for linked media buy
      const earlyReturn = await executeApprovedMediaBuyCascade(id, stepId, userEmail);
      if (earlyReturn) {
        return reply.send({ success: true });
      }

      return reply.send({ success: true });
    },
  );

  fastify.post(
    "/tenant/:id/workflows/:workflowId/steps/:stepId/reject",
    async (request, reply) => {
      const { id, stepId } = request.params as { id: string; workflowId: string; stepId: string };
      if (!(await requireTenantAccess(request, reply, id))) return;

      request.auditOperation = "reject_workflow_step";

      const session = getAdminSession(request);
      const body = (request.body ?? {}) as Record<string, unknown>;
      const reason = typeof body.reason === "string" ? body.reason : "No reason provided";

      const [row] = await db
        .select()
        .from(workflowSteps)
        .innerJoin(contexts, eq(workflowSteps.contextId, contexts.contextId))
        .where(and(eq(workflowSteps.stepId, stepId), eq(contexts.tenantId, id)))
        .limit(1)
        .then((rows) => rows.map((r) => r.workflow_steps));

      if (!row) return reply.code(404).send({ error: "Workflow step not found" });

      const userEmail = typeof session.user === "string" ? session.user : "system";
      const comments: Comment[] = Array.isArray(row.comments) ? [...row.comments] : [];
      comments.push({
        user: userEmail,
        timestamp: new Date().toISOString(),
        comment: `Rejected: ${reason}`,
      });

      await db
        .update(workflowSteps)
        .set({
          status: "rejected",
          completedAt: new Date(),
          comments,
        })
        .where(eq(workflowSteps.stepId, stepId));

      return reply.send({ success: true });
    },
  );
};

export default stepActionsRoute;
