import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { syncJobs } from "../../../db/schema/syncJobs.js";
import {
  latestSyncStatusRouteSchema,
  resetStuckSyncRouteSchema,
  syncStatusByIdRouteSchema,
} from "../../../routes/schemas/admin/gam/syncStatus.schema.js";
import { requireTenantAccess } from "../../services/authGuard.js";
import { getAdminSession } from "../../services/sessionService.js";

const syncStatusRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/tenant/:id/gam/sync-status/:syncId", { schema: syncStatusByIdRouteSchema }, async (request, reply) => {
    const { id, syncId } = request.params as { id: string; syncId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const [syncJob] = await db
      .select()
      .from(syncJobs)
      .where(and(eq(syncJobs.syncId, syncId), eq(syncJobs.tenantId, id)))
      .limit(1);

    if (!syncJob) return reply.code(404).send({ error: "Sync job not found" });

    const response: Record<string, unknown> = {
      sync_id: syncJob.syncId,
      status: syncJob.status,
      started_at: syncJob.startedAt?.toISOString() ?? null,
      completed_at: syncJob.completedAt?.toISOString() ?? null,
    };

    if (syncJob.progress) response["progress"] = syncJob.progress;

    if (syncJob.summary) {
      try {
        response["summary"] = JSON.parse(syncJob.summary);
      } catch {
        response["summary"] = syncJob.summary;
      }
    }

    if (syncJob.errorMessage) response["error"] = syncJob.errorMessage;

    return reply.send(response);
  });

  fastify.get("/tenant/:id/gam/sync-status/latest", { schema: latestSyncStatusRouteSchema }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const [syncJob] = await db
      .select()
      .from(syncJobs)
      .where(
        and(
          eq(syncJobs.tenantId, id),
          eq(syncJobs.status, "running"),
          eq(syncJobs.syncType, "inventory"),
        ),
      )
      .orderBy(desc(syncJobs.startedAt))
      .limit(1);

    if (!syncJob) return reply.code(404).send({ message: "No running sync found" });

    const response: Record<string, unknown> = {
      sync_id: syncJob.syncId,
      status: syncJob.status,
      started_at: syncJob.startedAt?.toISOString() ?? null,
    };

    if (syncJob.progress) response["progress"] = syncJob.progress;

    return reply.send(response);
  });

  fastify.post("/tenant/:id/gam/reset-stuck-sync", { schema: resetStuckSyncRouteSchema }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const session = getAdminSession(request);
    if (session.role === "viewer") {
      return reply.code(403).send({ success: false, error: "Access denied" });
    }

    request.auditOperation = "reset_stuck_gam_sync";

    try {
      const [runningSync] = await db
        .select()
        .from(syncJobs)
        .where(
          and(
            eq(syncJobs.tenantId, id),
            eq(syncJobs.status, "running"),
            eq(syncJobs.syncType, "inventory"),
          ),
        )
        .limit(1);

      if (!runningSync) {
        return reply.code(404).send({ success: false, message: "No running sync found to reset" });
      }

      await db
        .update(syncJobs)
        .set({
          status: "failed",
          completedAt: new Date(),
          errorMessage: "Manually reset by admin (sync appeared to be stuck)",
        })
        .where(eq(syncJobs.syncId, runningSync.syncId));

      return reply.send({
        success: true,
        message: "Stuck sync has been reset. You can now start a new sync.",
        reset_sync_id: runningSync.syncId,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.code(500).send({ success: false, error: message });
    }
  });
};

export default syncStatusRoute;
