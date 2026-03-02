import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { auditLogs } from "../../../db/schema/auditLogs.js";
import { contexts } from "../../../db/schema/contexts.js";
import { tenants } from "../../../db/schema/tenants.js";
import { workflowSteps } from "../../../db/schema/workflowSteps.js";
import { getAdminSession } from "../../services/sessionService.js";

const defaultPolicySettings = {
  enabled: true,
  require_manual_review: false,
  default_prohibited_categories: [
    "illegal_content",
    "hate_speech",
    "violence",
    "adult_content",
    "misleading_health_claims",
    "financial_scams",
  ],
  default_prohibited_tactics: [
    "targeting_children_under_13",
    "discriminatory_targeting",
    "deceptive_claims",
    "impersonation",
    "privacy_violations",
  ],
  prohibited_advertisers: [] as string[],
  prohibited_categories: [] as string[],
  prohibited_tactics: [] as string[],
};

const policyPagesRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  async function getPolicyIndexPayload(tenantId: string) {
    const [tenant] = await db
      .select({ tenantId: tenants.tenantId, name: tenants.name, policySettings: tenants.policySettings })
      .from(tenants)
      .where(eq(tenants.tenantId, tenantId))
      .limit(1);
    if (!tenant) return null;

    const tenantPolicies = (tenant.policySettings ?? {}) as Record<string, unknown>;
    const policySettings = { ...defaultPolicySettings, ...tenantPolicies };

    const auditRows = await db
      .select({
        timestamp: auditLogs.timestamp,
        principalId: auditLogs.principalId,
        success: auditLogs.success,
        details: auditLogs.details,
      })
      .from(auditLogs)
      .where(and(eq(auditLogs.tenantId, tenantId), eq(auditLogs.operation, "policy_check")))
      .orderBy(desc(auditLogs.timestamp))
      .limit(20);

    const recentChecks = auditRows.map((log) => {
      const details = (log.details ?? {}) as Record<string, unknown>;
      return {
        timestamp: log.timestamp?.toISOString() ?? null,
        principal_id: log.principalId,
        success: log.success,
        status: details.policy_status ?? "unknown",
        brief: details.brief ?? "",
        reason: details.reason ?? "",
      };
    });

    const pendingSteps = await db
      .select({
        stepId: workflowSteps.stepId,
        createdAt: workflowSteps.createdAt,
        requestData: workflowSteps.requestData,
      })
      .from(workflowSteps)
      .innerJoin(contexts, eq(workflowSteps.contextId, contexts.contextId))
      .where(
        and(
          eq(contexts.tenantId, tenantId),
          eq(workflowSteps.stepType, "policy_review"),
          eq(workflowSteps.status, "pending"),
        ),
      )
      .orderBy(desc(workflowSteps.createdAt));

    const pendingReviews = pendingSteps.map((step) => {
      const data = (step.requestData ?? {}) as Record<string, unknown>;
      return {
        task_id: step.stepId,
        created_at: step.createdAt?.toISOString() ?? null,
        brief: data.brief ?? "",
        advertiser: data.promoted_offering ?? "",
      };
    });

    return {
      tenant_id: tenant.tenantId,
      tenant_name: tenant.name,
      policy_settings: policySettings,
      recent_checks: recentChecks,
      pending_reviews: pendingReviews,
    };
  }

  fastify.get("/tenant/:id/policy/", async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = getAdminSession(request);
    if (!session.user) return reply.code(401).send({ error: "UNAUTHENTICATED" });
    if (session.role === "viewer") return reply.code(403).send({ error: "Access denied" });
    if (session.role === "tenant_admin" && session.tenant_id !== id) {
      return reply.code(403).send({ error: "Access denied" });
    }

    const payload = await getPolicyIndexPayload(id);
    if (!payload) return reply.code(404).send({ error: "Tenant not found" });
    return reply.send(payload);
  });

  fastify.get("/tenant/:id/policy/rules", async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = getAdminSession(request);
    if (!session.user) return reply.code(401).send({ error: "UNAUTHENTICATED" });
    if (session.role === "viewer") return reply.code(403).send({ error: "Access denied" });
    if (session.role === "tenant_admin" && session.tenant_id !== id) {
      return reply.code(403).send({ error: "Access denied" });
    }

    const payload = await getPolicyIndexPayload(id);
    if (!payload) return reply.code(404).send({ error: "Tenant not found" });
    return reply.send(payload);
  });
};

export default policyPagesRoute;
