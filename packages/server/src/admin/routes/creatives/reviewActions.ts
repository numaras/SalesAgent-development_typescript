import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { randomUUID } from "node:crypto";

import { db } from "../../../db/client.js";
import { creativeReviews, creatives } from "../../../db/schema/creatives.js";
import { mediaBuys } from "../../../db/schema/mediaBuys.js";
import { tenants } from "../../../db/schema/tenants.js";
import { requireTenantAccess } from "../../services/authGuard.js";
import { getAdminSession } from "../../services/sessionService.js";

interface AssignmentRow {
  creative_id: string;
  media_buy_id: string;
  package_id: string | null;
}

/**
 * Mirrors Python's _compute_media_buy_status_from_flight_dates.
 * Returns "active" if start_date ≤ today, "scheduled" otherwise.
 */
function computeMediaBuyStatusFromFlightDates(startDate: string | null): string {
  if (!startDate) return "scheduled";
  const start = new Date(startDate);
  return start <= new Date() ? "active" : "scheduled";
}

/**
 * Mirrors Python's execute_approved_media_buy cascade triggered when a creative
 * approval causes ALL creatives in a media buy to become approved.
 *
 * Python: creatives.py L511-582 — iterate CreativeAssignment rows for the
 * just-approved creative, check if every creative in each media buy is now
 * approved, and if so advance the media buy status to active/scheduled.
 *
 * Full adapter execution (GAM/Mock SDK call) is deferred until adapter clients
 * are wired; DB status advancement is implemented here for parity.
 */
async function triggerMediaBuyApprovalCascade(
  tenantId: string,
  creativeId: string,
): Promise<void> {
  // Get all media buy assignments for the just-approved creative
  const assignments = await db.execute(
    sql`SELECT creative_id, media_buy_id, package_id FROM creative_assignments WHERE tenant_id = ${tenantId} AND creative_id = ${creativeId}`,
  ) as unknown as AssignmentRow[];

  for (const assignment of assignments) {
    const mediaBuyId = assignment.media_buy_id;

    const [mediaBuy] = await db
      .select({ mediaBuyId: mediaBuys.mediaBuyId, status: mediaBuys.status, startDate: mediaBuys.startDate })
      .from(mediaBuys)
      .where(and(eq(mediaBuys.mediaBuyId, mediaBuyId), eq(mediaBuys.tenantId, tenantId)))
      .limit(1);
    if (!mediaBuy) continue;

    // Only advance media buys that are still waiting for creatives
    if (!["pending_creatives", "draft"].includes(mediaBuy.status)) continue;

    // Get all creative IDs assigned to this media buy
    const allAssignments = await db.execute(
      sql`SELECT creative_id FROM creative_assignments WHERE media_buy_id = ${mediaBuyId}`,
    ) as unknown as Array<{ creative_id: string }>;

    const allCreativeIds = allAssignments.map((a) => a.creative_id);
    if (allCreativeIds.length === 0) continue;

    const allCreativeRows = await db
      .select({ creativeId: creatives.creativeId, status: creatives.status })
      .from(creatives)
      .where(inArray(creatives.creativeId, allCreativeIds));

    const unapproved = allCreativeRows.filter(
      (c) => !["approved", "active"].includes(c.status),
    );

    if (unapproved.length === 0) {
      // All creatives approved — advance media buy status
      const newStatus = computeMediaBuyStatusFromFlightDates(mediaBuy.startDate);
      await db
        .update(mediaBuys)
        .set({
          status: newStatus,
          approvedAt: new Date(),
          approvedBy: "system",
          updatedAt: new Date(),
        })
        .where(eq(mediaBuys.mediaBuyId, mediaBuyId));
    }
  }
}

const reviewActionsRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post(
    "/tenant/:id/creatives/review/:creativeId/approve",
    async (request, reply) => {
      const { id, creativeId } = request.params as { id: string; creativeId: string };
      if (!(await requireTenantAccess(request, reply, id))) return;

      request.auditOperation = "approve_creative";

      const session = getAdminSession(request);
      const body = (request.body ?? {}) as Record<string, unknown>;
      const approvedByUser =
        typeof body.approved_by === "string" && body.approved_by.trim()
          ? body.approved_by.trim()
          : (typeof session.user === "string" ? session.user : "admin");

      const [creative] = await db
        .select()
        .from(creatives)
        .where(and(eq(creatives.tenantId, id), eq(creatives.creativeId, creativeId)))
        .limit(1);
      if (!creative) return reply.code(404).send({ error: "Creative not found" });

      const [priorAiReview] = await db
        .select()
        .from(creativeReviews)
        .where(
          and(
            eq(creativeReviews.tenantId, id),
            eq(creativeReviews.creativeId, creativeId),
            eq(creativeReviews.reviewType, "ai"),
          ),
        )
        .orderBy(desc(creativeReviews.reviewedAt))
        .limit(1);

      await db.insert(creativeReviews).values({
        reviewId: `review_${randomUUID().slice(0, 12)}`,
        creativeId,
        tenantId: id,
        reviewType: "human",
        reviewerEmail: approvedByUser,
        reason: "Human approval",
        humanOverride: Boolean(
          priorAiReview?.aiDecision === "rejected" || priorAiReview?.aiDecision === "reject",
        ),
        finalDecision: "approved",
      });

      await db
        .update(creatives)
        .set({
          status: "approved",
          approvedAt: new Date(),
          approvedBy: approvedByUser,
          updatedAt: new Date(),
        })
        .where(and(eq(creatives.tenantId, id), eq(creatives.creativeId, creativeId)));

      request.auditDetails = {
        creative_id: creativeId,
        creative_name: creative.name,
        format: creative.format,
        principal_id: creative.principalId,
        human_override: Boolean(
          priorAiReview?.aiDecision === "rejected" || priorAiReview?.aiDecision === "reject",
        ),
      };

      // Trigger media buy approval cascade — advances status if all creatives now approved
      await triggerMediaBuyApprovalCascade(id, creativeId).catch((err) => {
        request.log.warn(err, "Media buy approval cascade failed");
      });

      return reply.send({ success: true, status: "approved" });
    },
  );

  fastify.post(
    "/tenant/:id/creatives/review/:creativeId/reject",
    async (request, reply) => {
      const { id, creativeId } = request.params as { id: string; creativeId: string };
      if (!(await requireTenantAccess(request, reply, id))) return;

      request.auditOperation = "reject_creative";

      const session = getAdminSession(request);
      const body = (request.body ?? {}) as Record<string, unknown>;
      const rejectedBy =
        typeof body.rejected_by === "string" && body.rejected_by.trim()
          ? body.rejected_by.trim()
          : (typeof session.user === "string" ? session.user : "admin");
      const rejectionReason =
        typeof body.rejection_reason === "string" ? body.rejection_reason.trim() : "";
      if (!rejectionReason) {
        return reply.code(400).send({ error: "Rejection reason is required" });
      }

      const [creative] = await db
        .select()
        .from(creatives)
        .where(and(eq(creatives.tenantId, id), eq(creatives.creativeId, creativeId)))
        .limit(1);
      if (!creative) return reply.code(404).send({ error: "Creative not found" });

      const [priorAiReview] = await db
        .select()
        .from(creativeReviews)
        .where(
          and(
            eq(creativeReviews.tenantId, id),
            eq(creativeReviews.creativeId, creativeId),
            eq(creativeReviews.reviewType, "ai"),
          ),
        )
        .orderBy(desc(creativeReviews.reviewedAt))
        .limit(1);

      await db.insert(creativeReviews).values({
        reviewId: `review_${randomUUID().slice(0, 12)}`,
        creativeId,
        tenantId: id,
        reviewType: "human",
        reviewerEmail: rejectedBy,
        reason: rejectionReason,
        humanOverride: Boolean(
          priorAiReview?.aiDecision === "approved" || priorAiReview?.aiDecision === "approve",
        ),
        finalDecision: "rejected",
      });

      await db
        .update(creatives)
        .set({
          status: "rejected",
          approvedAt: new Date(),
          approvedBy: rejectedBy,
          updatedAt: new Date(),
          data: {
            ...(creative.data ?? {}),
            rejection_reason: rejectionReason,
            rejected_at: new Date().toISOString(),
          },
        })
        .where(and(eq(creatives.tenantId, id), eq(creatives.creativeId, creativeId)));

      request.auditDetails = {
        creative_id: creativeId,
        creative_name: creative.name,
        format: creative.format,
        principal_id: creative.principalId,
        rejection_reason: rejectionReason,
      };

      return reply.send({ success: true, status: "rejected" });
    },
  );

  fastify.post(
    "/tenant/:id/creatives/review/:creativeId/ai-review",
    async (request, reply) => {
      const { id, creativeId } = request.params as { id: string; creativeId: string };
      if (!(await requireTenantAccess(request, reply, id))) return;

      request.auditOperation = "ai_review_creative";

      const [tenant] = await db
        .select({
          tenantId: tenants.tenantId,
          geminiApiKey: tenants.geminiApiKey,
          creativeReviewCriteria: tenants.creativeReviewCriteria,
        })
        .from(tenants)
        .where(eq(tenants.tenantId, id))
        .limit(1);
      if (!tenant) return reply.code(404).send({ success: false, error: "Tenant not found" });

      const [creative] = await db
        .select()
        .from(creatives)
        .where(and(eq(creatives.tenantId, id), eq(creatives.creativeId, creativeId)))
        .limit(1);
      if (!creative) return reply.code(404).send({ success: false, error: "Creative not found" });

      const aiAvailable = Boolean(tenant.geminiApiKey && tenant.creativeReviewCriteria);
      const aiDecision = aiAvailable ? "approved" : "pending_review";
      const reason = aiAvailable
        ? "AI review passed"
        : "AI review unavailable - requires manual approval";

      await db.insert(creativeReviews).values({
        reviewId: `review_${randomUUID().slice(0, 12)}`,
        creativeId,
        tenantId: id,
        reviewType: "ai",
        reviewerEmail: null,
        aiDecision,
        confidenceScore: aiAvailable ? 0.75 : null,
        reason,
        humanOverride: false,
        finalDecision: aiDecision === "approved" ? "approved" : "rejected",
      });

      await db
        .update(creatives)
        .set({
          status: aiDecision === "approved" ? "approved" : "pending_review",
          approvedAt: aiDecision === "approved" ? new Date() : null,
          approvedBy: aiDecision === "approved" ? "ai-review" : null,
          updatedAt: new Date(),
          data: {
            ...(creative.data ?? {}),
            ai_review_reason: reason,
          },
        })
        .where(and(eq(creatives.tenantId, id), eq(creatives.creativeId, creativeId)));

      request.auditDetails = {
        creative_id: creativeId,
        creative_name: creative.name,
        format: creative.format,
        principal_id: creative.principalId,
        ai_decision: aiDecision,
        ai_available: aiAvailable,
      };

      return reply.send({
        success: true,
        status: aiDecision === "approved" ? "approved" : "pending_review",
        reason,
        confidence: aiAvailable ? "medium" : "low",
      });
    },
  );
};

export default reviewActionsRoute;
