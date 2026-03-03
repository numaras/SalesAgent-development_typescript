import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { contexts } from "../../../db/schema/contexts.js";
import { mediaBuys, mediaPackages } from "../../../db/schema/mediaBuys.js";
import { principals } from "../../../db/schema/principals.js";
import { objectWorkflowMappings, workflowSteps } from "../../../db/schema/workflowSteps.js";
import { computeReadinessState, extractPackagesTotal } from "../../../services/mediaBuyReadinessService.js";
import { getMediaBuyDelivery } from "../../../services/deliveryQueryService.js";
import { requireTenantAccess } from "../../services/authGuard.js";

const mediaBuyDetailRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/tenant/:id/media-buy/:mbId", async (request, reply) => {
    const { id, mbId } = request.params as { id: string; mbId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const [mediaBuy] = await db
      .select()
      .from(mediaBuys)
      .where(and(eq(mediaBuys.tenantId, id), eq(mediaBuys.mediaBuyId, mbId)))
      .limit(1);
    if (!mediaBuy) return reply.code(404).send({ error: "Media buy not found" });

    const [principal] = await db
      .select()
      .from(principals)
      .where(and(eq(principals.tenantId, id), eq(principals.principalId, mediaBuy.principalId)))
      .limit(1);

    const packages = await db
      .select()
      .from(mediaPackages)
      .where(eq(mediaPackages.mediaBuyId, mbId));

    const packagesWithProduct = packages.map((pkg) => ({
      package_id: pkg.packageId,
      media_buy_id: pkg.mediaBuyId,
      budget: pkg.budget,
      bid_price: pkg.bidPrice,
      package_config: pkg.packageConfig,
    }));

    const readiness = computeReadinessState(
      mediaBuy.status,
      mediaBuy.startDate,
      mediaBuy.endDate,
      mediaBuy.startTime,
      mediaBuy.endTime,
      extractPackagesTotal(mediaBuy.rawRequest),
    );
    const computedState = readiness.state;

    // Get workflow steps linked to this media buy (mirrors Python ContextManager.get_object_lifecycle)
    const stepRows = await db
      .select({ step: workflowSteps })
      .from(workflowSteps)
      .innerJoin(objectWorkflowMappings, eq(workflowSteps.stepId, objectWorkflowMappings.stepId))
      .innerJoin(contexts, eq(workflowSteps.contextId, contexts.contextId))
      .where(
        and(
          eq(contexts.tenantId, id),
          eq(objectWorkflowMappings.objectType, "media_buy"),
          eq(objectWorkflowMappings.objectId, mbId),
        ),
      )
      .orderBy(workflowSteps.createdAt);

    const workflowStepsList = stepRows.map((r) => ({
      step_id: r.step.stepId,
      step_type: r.step.stepType,
      tool_name: r.step.toolName ?? null,
      status: r.step.status,
      owner: r.step.owner,
      created_at: r.step.createdAt?.toISOString() ?? null,
      completed_at: r.step.completedAt?.toISOString() ?? null,
      error_message: r.step.errorMessage ?? null,
    }));

    // Find pending approval step (mirrors Python operations.py L173-180)
    const pendingStepRow = stepRows.find((r) =>
      ["requires_approval", "pending_approval"].includes(r.step.status),
    );
    const pendingApprovalStep = pendingStepRow
      ? { step_id: pendingStepRow.step.stepId, status: pendingStepRow.step.status }
      : null;

    // Compute status_message (mirrors Python operations.py L188-200)
    let statusMessage: { type: string; message: string } | null = null;
    if (pendingApprovalStep) {
      statusMessage = {
        type: "approval_required",
        message: "This media buy requires manual approval before it can be activated.",
      };
    } else if (mediaBuy.status === "pending") {
      statusMessage = {
        type: "pending_other",
        message:
          "This media buy is pending. It may be waiting for creatives or other requirements.",
      };
    }

    // creative_assignments_by_package (mirrors Python operations.py L146-167)
    // Uses raw SQL for parity/readability.
    type AssignmentRow = {
      package_id: string;
      creative_id: string;
      assignment_id: string;
      weight: number;
      creative_name: string;
      creative_format: string;
      creative_status: string;
    };
    const assignmentRows = (await db.execute(
      sql`
        SELECT
          ca.assignment_id,
          ca.package_id,
          ca.creative_id,
          ca.weight,
          cr.name   AS creative_name,
          cr.format AS creative_format,
          cr.status AS creative_status
        FROM creative_assignments ca
        JOIN creatives cr ON ca.creative_id = cr.creative_id
        WHERE ca.media_buy_id = ${mbId}
          AND ca.tenant_id   = ${id}
        ORDER BY ca.package_id, ca.created_at
      `,
    )) as unknown as AssignmentRow[];

    const creativeAssignmentsByPackage: Record<string, unknown[]> = {};
    for (const row of assignmentRows) {
      const pkgId = row.package_id;
      if (!creativeAssignmentsByPackage[pkgId]) {
        creativeAssignmentsByPackage[pkgId] = [];
      }
      creativeAssignmentsByPackage[pkgId].push({
        assignment_id: row.assignment_id,
        creative_id: row.creative_id,
        weight: row.weight,
        creative: {
          creative_id: row.creative_id,
          name: row.creative_name,
          format: row.creative_format,
          status: row.creative_status,
        },
      });
    }

    let deliveryMetrics: Record<string, unknown> | null = null;
    if (["active", "approved", "completed"].includes(mediaBuy.status)) {
      try {
        const deliveryResponse = await getMediaBuyDelivery(
          { tenantId: id, principalId: mediaBuy.principalId },
          { media_buy_ids: [mbId], status_filter: "all" },
        );
        const first = deliveryResponse.media_buy_deliveries[0];
        if (first) {
          deliveryMetrics = {
            impressions: first.totals.impressions,
            spend: first.totals.spend,
            clicks: first.totals.clicks ?? null,
            ctr: first.totals.ctr ?? null,
            currency: deliveryResponse.currency,
            by_package: first.by_package,
          };
        }
      } catch {
        deliveryMetrics = null;
      }
    }

    return reply.send({
      tenant_id: id,
      media_buy: {
        media_buy_id: mediaBuy.mediaBuyId,
        tenant_id: mediaBuy.tenantId,
        principal_id: mediaBuy.principalId,
        buyer_ref: mediaBuy.buyerRef,
        order_name: mediaBuy.orderName,
        advertiser_name: mediaBuy.advertiserName,
        campaign_objective: mediaBuy.campaignObjective,
        kpi_goal: mediaBuy.kpiGoal,
        budget: mediaBuy.budget,
        currency: mediaBuy.currency,
        start_date: mediaBuy.startDate != null ? String(mediaBuy.startDate).slice(0, 10) : null,
        end_date: mediaBuy.endDate != null ? String(mediaBuy.endDate).slice(0, 10) : null,
        start_time: mediaBuy.startTime?.toISOString() ?? null,
        end_time: mediaBuy.endTime?.toISOString() ?? null,
        status: mediaBuy.status,
        created_at: mediaBuy.createdAt?.toISOString() ?? null,
        updated_at: mediaBuy.updatedAt?.toISOString() ?? null,
        approved_at: mediaBuy.approvedAt?.toISOString() ?? null,
        approved_by: mediaBuy.approvedBy,
      },
      principal: principal
        ? {
            principal_id: principal.principalId,
            name: principal.name,
            platform_mappings: principal.platformMappings,
          }
        : null,
      packages: packagesWithProduct,
      workflow_steps: workflowStepsList,
      creative_assignments_by_package: creativeAssignmentsByPackage,
      pending_approval_step: pendingApprovalStep,
      status_message: statusMessage,
      delivery_metrics: deliveryMetrics,
      computed_state: computedState,
      readiness,
    });
  });
};

export default mediaBuyDetailRoute;
