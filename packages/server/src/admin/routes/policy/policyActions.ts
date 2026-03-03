import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { auditLogs } from "../../../db/schema/auditLogs.js";
import { contexts } from "../../../db/schema/contexts.js";
import { tenants } from "../../../db/schema/tenants.js";
import { workflowSteps } from "../../../db/schema/workflowSteps.js";
import { requireTenantAccess } from "../../services/authGuard.js";
import { getAdminSession } from "../../services/sessionService.js";

const defaultProhibitedCategories = [
  "illegal_content",
  "hate_speech",
  "violence",
  "adult_content",
  "misleading_health_claims",
  "financial_scams",
];
const defaultProhibitedTactics = [
  "targeting_children_under_13",
  "discriminatory_targeting",
  "deceptive_claims",
  "impersonation",
  "privacy_violations",
];

function parseTextareaLines(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return value
    .trim()
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

const policyActionsRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post("/tenant/:id/policy/update", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;
    const session = getAdminSession(request);
    if (!session.user) return reply.code(401).send({ error: "UNAUTHENTICATED" });
    if (session.role !== "super_admin" && session.role !== "tenant_admin") {
      return reply.code(403).send({ error: "Access denied" });
    }
    if (session.role === "tenant_admin" && session.tenant_id !== id) {
      return reply.code(403).send({ error: "Access denied" });
    }

    const [tenant] = await db
      .select({ tenantId: tenants.tenantId, policySettings: tenants.policySettings })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const current = (tenant.policySettings ?? {}) as Record<string, unknown>;
    const currentPolicy = (current.policy_settings ?? current) as Record<string, unknown>;
    const rawBody = (typeof request.body === "object" && request.body !== null ? request.body : {}) as Record<string, unknown>;

    const enabled = rawBody.enabled === true || rawBody.enabled === "on" || (typeof rawBody.enabled === "string" && rawBody.enabled.toLowerCase() === "true");
    const requireManualReview = rawBody.require_manual_review === true || rawBody.require_manual_review === "on" || (typeof rawBody.require_manual_review === "string" && rawBody.require_manual_review.toLowerCase() === "true");
    const prohibitedAdvertisers = Array.isArray(rawBody.prohibited_advertisers) ? (rawBody.prohibited_advertisers as string[]) : parseTextareaLines(rawBody.prohibited_advertisers);
    const prohibitedCategories = Array.isArray(rawBody.prohibited_categories) ? (rawBody.prohibited_categories as string[]) : parseTextareaLines(rawBody.prohibited_categories);
    const prohibitedTactics = Array.isArray(rawBody.prohibited_tactics) ? (rawBody.prohibited_tactics as string[]) : parseTextareaLines(rawBody.prohibited_tactics);

    const defaultCategories = (currentPolicy.default_prohibited_categories as string[]) ?? defaultProhibitedCategories;
    const defaultTactics = (currentPolicy.default_prohibited_tactics as string[]) ?? defaultProhibitedTactics;

    const policySettings = {
      enabled,
      require_manual_review: requireManualReview,
      prohibited_advertisers: prohibitedAdvertisers,
      prohibited_categories: prohibitedCategories,
      prohibited_tactics: prohibitedTactics,
      default_prohibited_categories: defaultCategories,
      default_prohibited_tactics: defaultTactics,
    };

    request.auditOperation = "update_policy";

    await db
      .update(tenants)
      .set({ policySettings: policySettings as unknown as Record<string, unknown>, updatedAt: new Date() })
      .where(eq(tenants.tenantId, id));

    return reply.send({ success: true, message: "Policy updated" });
  });

  fastify.get("/tenant/:id/policy/review/:taskId", async (request, reply) => {
    const { id, taskId } = request.params as { id: string; taskId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;
    const session = getAdminSession(request);
    if (!session.user) return reply.code(401).send({ error: "UNAUTHENTICATED" });
    if (session.role === "viewer") return reply.code(403).send({ error: "Access denied" });
    if (session.role === "tenant_admin" && session.tenant_id !== id) {
      return reply.code(403).send({ error: "Access denied" });
    }

    const [step] = await db
      .select({
        stepId: workflowSteps.stepId,
        createdAt: workflowSteps.createdAt,
        requestData: workflowSteps.requestData,
      })
      .from(workflowSteps)
      .innerJoin(contexts, eq(workflowSteps.contextId, contexts.contextId))
      .where(
        and(eq(contexts.tenantId, id), eq(workflowSteps.stepId, taskId)),
      )
      .limit(1);
    if (!step) return reply.code(404).send({ error: "Task not found" });

    const taskDetails = (step.requestData ?? {}) as Record<string, unknown>;
    return reply.send({
      tenant_id: id,
      task_id: taskId,
      task_details: taskDetails,
      created_at: step.createdAt?.toISOString() ?? null,
    });
  });

  fastify.post("/tenant/:id/policy/review/:taskId", async (request, reply) => {
    const { id, taskId } = request.params as { id: string; taskId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;
    const session = getAdminSession(request);
    if (!session.user) return reply.code(401).send({ error: "UNAUTHENTICATED" });
    if (session.role === "viewer") return reply.code(403).send({ error: "Access denied" });
    if (session.role === "tenant_admin" && session.tenant_id !== id) {
      return reply.code(403).send({ error: "Access denied" });
    }

    request.auditOperation = "policy_review";

    const body = (request.body ?? {}) as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "";
    const notes = typeof body.notes === "string" ? body.notes : "";

    const [step] = await db
      .select({ stepId: workflowSteps.stepId })
      .from(workflowSteps)
      .innerJoin(contexts, eq(workflowSteps.contextId, contexts.contextId))
      .where(
        and(eq(contexts.tenantId, id), eq(workflowSteps.stepId, taskId)),
      )
      .limit(1);
    if (!step) return reply.code(404).send({ error: "Task not found" });

    const status = action === "approve" ? "completed" : action === "reject" ? "failed" : null;
    if (!status) return reply.code(400).send({ error: "action must be 'approve' or 'reject'" });

    const responseData = { approved: action === "approve", notes };

    await db
      .update(workflowSteps)
      .set({
        status,
        responseData: responseData as unknown as Record<string, unknown>,
        completedAt: new Date(),
      })
      .where(eq(workflowSteps.stepId, taskId));

    await db.insert(auditLogs).values({
      tenantId: id,
      operation: "policy_review",
      principalId: session.user,
      success: true,
      details: { task_id: taskId, action, notes },
    });

    return reply.send({ success: true, message: `Task ${action === "approve" ? "approved" : "rejected"}` });
  });
};

export default policyActionsRoute;
