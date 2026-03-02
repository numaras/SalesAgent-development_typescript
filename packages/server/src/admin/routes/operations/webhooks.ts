import { and, desc, eq, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { auditLogs } from "../../../db/schema/auditLogs.js";
import { mediaBuys } from "../../../db/schema/mediaBuys.js";
import { principals } from "../../../db/schema/principals.js";
import { tenants } from "../../../db/schema/tenants.js";
import { requireTenantAccess } from "../../services/authGuard.js";

const webhooksRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/tenant/:id/webhooks", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const [tenant] = await db.select().from(tenants).where(eq(tenants.tenantId, id)).limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const query = request.query as { media_buy_id?: string; principal_id?: string; limit?: string };
    const mediaBuyFilter = typeof query.media_buy_id === "string" ? query.media_buy_id.trim() : undefined;
    const principalFilter = typeof query.principal_id === "string" ? query.principal_id.trim() : undefined;
    const limit = Math.min(Math.max(parseInt(query.limit ?? "100", 10) || 100, 1), 500);

    let whereClause = and(
      eq(auditLogs.tenantId, id),
      eq(auditLogs.operation, "send_delivery_webhook"),
    );
    if (principalFilter) {
      whereClause = and(whereClause, eq(auditLogs.principalId, principalFilter));
    }
    if (mediaBuyFilter) {
      whereClause = and(
        whereClause,
        sql`${auditLogs.details}->>'media_buy_id' = ${mediaBuyFilter}`,
      );
    }

    const webhookLogs = await db
      .select({
        log_id: auditLogs.logId,
        timestamp: auditLogs.timestamp,
        principal_id: auditLogs.principalId,
        principal_name: auditLogs.principalName,
        success: auditLogs.success,
        error_message: auditLogs.errorMessage,
        details: auditLogs.details,
      })
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);

    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(whereClause);
    const totalWebhooks = Number(countResult[0]?.count ?? 0);

    const uniqueMediaBuys = new Set<string>();
    for (const log of webhookLogs) {
      const mbId = (log.details as Record<string, unknown>)?.media_buy_id;
      if (typeof mbId === "string") uniqueMediaBuys.add(mbId);
    }

    const mediaBuysList = await db
      .select({ media_buy_id: mediaBuys.mediaBuyId, order_name: mediaBuys.orderName, status: mediaBuys.status })
      .from(mediaBuys)
      .where(eq(mediaBuys.tenantId, id))
      .orderBy(desc(mediaBuys.createdAt))
      .limit(50);

    const principalsList = await db
      .select({ principal_id: principals.principalId, name: principals.name })
      .from(principals)
      .where(eq(principals.tenantId, id));

    return reply.send({
      tenant_id: id,
      tenant_name: tenant.name,
      webhook_logs: webhookLogs.map((log) => ({
        log_id: log.log_id,
        timestamp: log.timestamp?.toISOString() ?? null,
        principal_id: log.principal_id,
        principal_name: log.principal_name,
        success: log.success,
        error_message: log.error_message,
        details: log.details,
      })),
      total_webhooks: totalWebhooks,
      unique_media_buys: uniqueMediaBuys.size,
      media_buys: mediaBuysList,
      principals: principalsList,
      media_buy_filter: mediaBuyFilter ?? null,
      principal_filter: principalFilter ?? null,
      limit,
    });
  });
};

export default webhooksRoute;
