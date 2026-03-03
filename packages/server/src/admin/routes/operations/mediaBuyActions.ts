import { and, eq, inArray, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { creatives } from "../../../db/schema/creatives.js";
import { contexts } from "../../../db/schema/contexts.js";
import { mediaBuys } from "../../../db/schema/mediaBuys.js";
import { objectWorkflowMappings, workflowSteps } from "../../../db/schema/workflowSteps.js";
import { validateOutboundUrl } from "../../../security/outboundUrl.js";
import { getMediaBuyDelivery } from "../../../services/deliveryQueryService.js";
import { executeApprovedMediaBuyViaAdapter } from "../../../services/mediaBuyAdapterCall.js";
import { requireTenantAccess } from "../../services/authGuard.js";
import { getAdminSession } from "../../services/sessionService.js";

const WEBHOOK_TIMEOUT_MS = 10_000;

async function sendDeliveryWebhook(
  webhookUrl: string,
  authHeader: string | undefined,
  payload: unknown,
): Promise<{ ok: boolean; status: number; error?: string }> {
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authHeader) headers["Authorization"] = authHeader;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, status: 0, error: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timer);
  }
}

type Comment = { user: string; timestamp: string; comment: string };

const mediaBuyActionsRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post("/tenant/:id/media-buy/:mbId/approve", async (request, reply) => {
    const { id, mbId } = request.params as { id: string; mbId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    request.auditOperation = "approve_media_buy";

    const session = getAdminSession(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "";
    const reason = typeof body.reason === "string" ? body.reason : "";
    if (action !== "approve" && action !== "reject") {
      return reply.code(400).send({ error: "action must be 'approve' or 'reject'" });
    }

    const [stepRow] = await db
      .select({ step: workflowSteps })
      .from(workflowSteps)
      .innerJoin(objectWorkflowMappings, eq(workflowSteps.stepId, objectWorkflowMappings.stepId))
      .innerJoin(contexts, eq(workflowSteps.contextId, contexts.contextId))
      .where(
        and(
          eq(contexts.tenantId, id),
          eq(objectWorkflowMappings.objectType, "media_buy"),
          eq(objectWorkflowMappings.objectId, mbId),
          inArray(workflowSteps.status, ["requires_approval", "pending_approval", "pending"]),
        ),
      )
      .limit(1);

    if (!stepRow) {
      return reply.code(400).send({ error: "No pending approval found for this media buy" });
    }

    const step = stepRow.step;
    const userEmail = typeof session.user === "string" ? session.user : "system";

    // Build updated comments array (mirrors Python operations.py L349-357)
    const comments: Comment[] = Array.isArray(step.comments) ? [...step.comments] : [];
    if (action === "approve") {
      comments.push({
        user: userEmail,
        timestamp: new Date().toISOString(),
        comment: "Approved via media buy detail page",
      });
    } else {
      comments.push({
        user: userEmail,
        timestamp: new Date().toISOString(),
        comment: `Rejected: ${reason || "No reason provided"}`,
      });
    }

    // Update workflow step — Python L346 sets step.status = "approved" (not "completed")
    await db
      .update(workflowSteps)
      .set({
        status: action === "approve" ? "approved" : "rejected",
        responseData:
          action === "approve" ? { approved: true, notes: reason } : { approved: false, reason },
        completedAt: new Date(),
        comments,
      })
      .where(eq(workflowSteps.stepId, step.stepId));

    if (action === "approve") {
      const [mediaBuy] = await db
        .select()
        .from(mediaBuys)
        .where(and(eq(mediaBuys.tenantId, id), eq(mediaBuys.mediaBuyId, mbId)))
        .limit(1);

      if (mediaBuy && mediaBuy.status === "pending_approval") {
        // Check creative approval state before advancing status (mirrors Python L361-384)
        const assignmentRows = (await db.execute(
          sql`SELECT creative_id FROM creative_assignments WHERE media_buy_id = ${mbId} AND tenant_id = ${id}`,
        )) as unknown as Array<{ creative_id: string }>;

        let allCreativesApproved = true;
        if (assignmentRows.length > 0) {
          const creativeIds = assignmentRows.map((a) => a.creative_id);
          const allCreativesRows = await db
            .select({ creativeId: creatives.creativeId, status: creatives.status })
            .from(creatives)
            .where(inArray(creatives.creativeId, creativeIds));

          for (const c of allCreativesRows) {
            if (c.status !== "approved") {
              allCreativesApproved = false;
              break;
            }
          }
        } else {
          // No creatives assigned yet (Python L382-384: all_creatives_approved = False)
          allCreativesApproved = false;
        }

        let newStatus: string;
        if (allCreativesApproved) {
          // Date-based status logic (mirrors Python operations.py L387-413)
          const now = new Date();
          if (mediaBuy.startTime && mediaBuy.endTime) {
            if (now < mediaBuy.startTime) {
              newStatus = "scheduled";
            } else if (now > mediaBuy.endTime) {
              newStatus = "completed";
            } else {
              newStatus = "active";
            }
          } else {
            newStatus = "active";
          }
        } else {
          // Needs creative approval (Python L417: status = "draft")
          newStatus = "draft";
        }

        await db
          .update(mediaBuys)
          .set({
            status: newStatus,
            approvedAt: new Date(),
            approvedBy: userEmail,
            updatedAt: new Date(),
          })
          .where(and(eq(mediaBuys.tenantId, id), eq(mediaBuys.mediaBuyId, mbId)));

        const execution = await executeApprovedMediaBuyViaAdapter(
          { tenantId: id, principalId: mediaBuy.principalId },
          mbId,
          mediaBuy.rawRequest,
        );
        if (!execution.success) {
          await db
            .update(mediaBuys)
            .set({ status: "failed", updatedAt: new Date() })
            .where(and(eq(mediaBuys.tenantId, id), eq(mediaBuys.mediaBuyId, mbId)));

          return reply.code(500).send({
            success: false,
            error: `Media buy approved but adapter creation failed: ${execution.error}`,
          });
        }
      }
    } else {
      // reject: set media buy to "rejected" if currently pending_approval (Python L533-535)
      const [mediaBuy] = await db
        .select({ status: mediaBuys.status })
        .from(mediaBuys)
        .where(and(eq(mediaBuys.tenantId, id), eq(mediaBuys.mediaBuyId, mbId)))
        .limit(1);

      if (mediaBuy && mediaBuy.status === "pending_approval") {
        await db
          .update(mediaBuys)
          .set({ status: "rejected", updatedAt: new Date() })
          .where(and(eq(mediaBuys.tenantId, id), eq(mediaBuys.mediaBuyId, mbId)));
      }
    }

    return reply.send({
      success: true,
      message: action === "approve" ? "Media buy approved successfully" : "Media buy rejected",
    });
  });

  fastify.post("/tenant/:id/media-buy/:mbId/trigger-delivery-webhook", async (request, reply) => {
    const { id, mbId } = request.params as { id: string; mbId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const [mediaBuy] = await db
      .select()
      .from(mediaBuys)
      .where(and(eq(mediaBuys.tenantId, id), eq(mediaBuys.mediaBuyId, mbId)))
      .limit(1);
    if (!mediaBuy) return reply.code(404).send({ error: "Media buy not found" });

    // Mirror _legacy/src/services/delivery_webhook_scheduler.py trigger_report_for_media_buy_by_id()
    const rawRequest = mediaBuy.rawRequest as Record<string, unknown> | null;
    const reportingWebhook = rawRequest?.["reporting_webhook"] as Record<string, unknown> | undefined;

    if (!reportingWebhook || typeof reportingWebhook["url"] !== "string") {
      return reply.code(400).send({
        error: "No reporting_webhook configured for this media buy. Add a reporting_webhook to the media buy request.",
      });
    }

    const webhookUrl = reportingWebhook["url"] as string;
    const webhookCheck = validateOutboundUrl(webhookUrl, { allowHttp: true });
    if (!webhookCheck.valid) {
      return reply.code(400).send({
        error: `Invalid reporting_webhook URL: ${webhookCheck.error}`,
      });
    }

    // Build a principal context from the media buy to query delivery data
    const deliveryCtx = {
      tenantId: id,
      principalId: mediaBuy.principalId ?? "admin",
    };

    let deliveryData: unknown;
    try {
      deliveryData = await getMediaBuyDelivery(deliveryCtx, {
        media_buy_ids: [mbId],
      });
    } catch (deliveryErr) {
      return reply.code(500).send({
        error: `Failed to fetch delivery data: ${deliveryErr instanceof Error ? deliveryErr.message : String(deliveryErr)}`,
      });
    }

    // Build auth header if configured
    const auth = reportingWebhook["authentication"] as Record<string, unknown> | undefined;
    let authHeader: string | undefined;
    if (auth?.["token"] && typeof auth["token"] === "string") {
      const authType = typeof auth["type"] === "string" ? auth["type"] : "Bearer";
      authHeader = `${authType} ${auth["token"]}`;
    }

    const payload = {
      task_type: "media_buy_delivery",
      notification_type: "manual_trigger",
      media_buy_id: mbId,
      tenant_id: id,
      triggered_at: new Date().toISOString(),
      data: deliveryData,
    };

    const result = await sendDeliveryWebhook(webhookUrl, authHeader, payload);

    if (!result.ok) {
      return reply.code(502).send({
        success: false,
        error: result.error ?? `Webhook returned HTTP ${result.status}`,
        webhook_status: result.status,
      });
    }

    return reply.send({
      success: true,
      message: "Delivery webhook triggered successfully",
      webhook_status: result.status,
    });
  });

  // Direct activation for draft/pending campaigns (no workflow step required).
  fastify.post("/tenant/:id/media-buy/:mbId/activate", async (request, reply) => {
    const { id, mbId } = request.params as { id: string; mbId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;
    request.auditOperation = "activate_media_buy";

    const session = getAdminSession(request);
    const userEmail = typeof session.user === "string" ? session.user : "admin";

    const [mediaBuy] = await db
      .select()
      .from(mediaBuys)
      .where(and(eq(mediaBuys.tenantId, id), eq(mediaBuys.mediaBuyId, mbId)))
      .limit(1);

    if (!mediaBuy) return reply.code(404).send({ error: "Media buy not found" });

    const allowedStatuses = ["draft", "pending", "pending_activation", "ready"];
    if (!allowedStatuses.includes(mediaBuy.status)) {
      return reply.code(400).send({
        error: `Cannot activate a campaign with status '${mediaBuy.status}'.`,
      });
    }

    const now = new Date();
    let newStatus = "active";
    if (mediaBuy.startTime && now < mediaBuy.startTime) newStatus = "scheduled";
    if (mediaBuy.endTime && now > mediaBuy.endTime) newStatus = "completed";

    await db
      .update(mediaBuys)
      .set({ status: newStatus, approvedAt: now, approvedBy: userEmail, updatedAt: now })
      .where(and(eq(mediaBuys.tenantId, id), eq(mediaBuys.mediaBuyId, mbId)));

    const execution = await executeApprovedMediaBuyViaAdapter(
      { tenantId: id, principalId: mediaBuy.principalId },
      mbId,
      mediaBuy.rawRequest,
    );

    if (!execution.success) {
      await db
        .update(mediaBuys)
        .set({ status: "failed", updatedAt: new Date() })
        .where(and(eq(mediaBuys.tenantId, id), eq(mediaBuys.mediaBuyId, mbId)));
      return reply.code(500).send({ success: false, error: `Activation failed: ${execution.error}` });
    }

    return reply.send({ success: true, message: `Campaign activated (${newStatus}).`, status: newStatus });
  });
};

export default mediaBuyActionsRoute;
