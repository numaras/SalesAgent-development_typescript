import { and, desc, eq, gt } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { auditLogs } from "../../../db/schema/auditLogs.js";
import { requireTenantAccess } from "../../services/authGuard.js";
import { parseAuditOperation } from "../../services/auditParseService.js";

type AuditRow = {
  logId: number;
  timestamp: Date | null;
  operation: string;
  principalName: string | null;
  success: boolean;
  errorMessage: string | null;
  details: Record<string, unknown> | null;
};

function timeRelative(ts: Date): string {
  const now = new Date();
  const deltaMs = now.getTime() - ts.getTime();
  const deltaSec = Math.floor(deltaMs / 1000);
  const deltaMin = Math.floor(deltaSec / 60);
  const deltaHour = Math.floor(deltaMin / 60);
  const deltaDay = Math.floor(deltaHour / 24);
  if (deltaDay > 0) return `${deltaDay}d ago`;
  if (deltaHour > 0) return `${deltaHour}h ago`;
  if (deltaMin > 0) return `${deltaMin}m ago`;
  return "Just now";
}

function formatActivityFromAuditLog(log: AuditRow): Record<string, unknown> {
  const parsed = parseAuditOperation(log.operation);
  const { adapterName, method } = parsed;
  const methodLower = method.toLowerCase();
  let activityType: string = !log.success ? "error" : parsed.type;

  const parsedDetails = (log.details ?? {}) as Record<string, unknown>;
  const details: Record<string, string> = {};
  let fullDetails: Record<string, unknown> = {};
  let actionRequired = false;

  if (methodLower.includes("get_products")) {
    details.primary = `Found ${Number(parsedDetails.product_count ?? 0)} products`;
    const brief = String(parsedDetails.brief ?? "");
    details.secondary = brief.length > 50 ? `Brief: "${brief.slice(0, 50)}..."` : `Brief: "${brief}"`;
    if (parsedDetails.products) {
      fullDetails = { products: parsedDetails.products, promoted: parsedDetails.promoted_product ?? "No specific promotion" };
    }
  } else if (methodLower.includes("create_media_buy")) {
    if (parsedDetails.budget != null) details.primary = `Budget: $${Number(parsedDetails.budget).toLocaleString()}`;
    if (parsedDetails.duration_days != null) details.secondary = `Duration: ${parsedDetails.duration_days} days`;
    fullDetails = { targeting: parsedDetails.targeting, media_buy_id: parsedDetails.media_buy_id ?? "N/A" };
  } else if (methodLower.includes("upload_creative")) {
    details.primary = `Format: ${String(parsedDetails.format ?? "Unknown")}`;
    if (parsedDetails.file_size != null) details.secondary = `Size: ${parsedDetails.file_size}`;
    fullDetails = { creative_id: parsedDetails.creative_id ?? "N/A", status: parsedDetails.status ?? "pending" };
  } else if (methodLower.includes("human") || methodLower.includes("approval")) {
    details.primary = "⚠️ Human approval required";
    details.secondary = String(parsedDetails.task_type ?? "Review required");
    fullDetails = { task_id: parsedDetails.task_id, task_details: parsedDetails.details ?? {} };
    actionRequired = true;
  } else if (adapterName === "A2A" || log.operation.startsWith("A2A.")) {
    details.primary = "🔄 A2A Protocol";
    const query = String(parsedDetails.query ?? "");
    details.secondary = query.length > 60 ? `Query: "${query.slice(0, 60)}..."` : `Query: "${query}"`;
    fullDetails = { ...parsedDetails };
  } else if (!log.success) {
    details.primary = "❌ Failed";
    const err = log.errorMessage ?? "";
    details.secondary = err.length > 75 ? `${err.slice(0, 75)}...` : err;
    fullDetails = { error_details: log.errorMessage };
  } else {
    details.primary = "✅ Success";
    for (const key of ["message", "result", "count", "status"]) {
      if (key in parsedDetails && parsedDetails[key] != null) {
        details.secondary = String(parsedDetails[key]).slice(0, 75);
        break;
      }
    }
  }

  const ts = log.timestamp ?? new Date(0);
  const timestampIso = ts.toISOString();

  return {
    id: log.logId,
    type: activityType,
    principal_name: log.principalName ?? "System",
    action: `Called ${method}`,
    details,
    full_details: fullDetails,
    timestamp: timestampIso,
    time_relative: timeRelative(ts),
    action_required: actionRequired,
    operation: log.operation,
    success: log.success,
  };
}

export async function getRecentActivities(
  tenantId: string,
  options: { since?: Date; limit?: number } = {},
): Promise<Record<string, unknown>[]> {
  const limit = Math.max(1, Math.min(options.limit ?? 50, 100));
  const whereClause = options.since
    ? and(eq(auditLogs.tenantId, tenantId), gt(auditLogs.timestamp, options.since))
    : eq(auditLogs.tenantId, tenantId);

  const rows = await db
    .select({
      logId: auditLogs.logId,
      timestamp: auditLogs.timestamp,
      operation: auditLogs.operation,
      principalName: auditLogs.principalName,
      success: auditLogs.success,
      errorMessage: auditLogs.errorMessage,
      details: auditLogs.details,
    })
    .from(auditLogs)
    .where(whereClause)
    .orderBy(desc(auditLogs.timestamp))
    .limit(limit);

  return rows.map((r) => formatActivityFromAuditLog(r as AuditRow));
}

const activityRestRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/tenant/:id/activity", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!id || id.length > 50) return reply.code(400).send({ error: "Invalid tenant ID" });

    const allowed = await requireTenantAccess(request, reply, id);
    if (!allowed) return;

    const activities = await getRecentActivities(id, { limit: 50 });
    return reply.send({
      activities,
      timestamp: new Date().toISOString(),
      count: activities.length,
    });
  });

  fastify.get("/tenant/:id/activities", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!id || id.length > 50) return reply.code(400).send({ error: "Invalid tenant ID" });

    const allowed = await requireTenantAccess(request, reply, id);
    if (!allowed) return;

    const sinceParam = (request.query as { since?: string }).since;
    let since: Date | undefined;
    if (sinceParam) {
      try {
        since = new Date(sinceParam.replace("Z", "+00:00"));
        if (Number.isNaN(since.getTime())) since = undefined;
      } catch {
        // ignore
      }
    }
    const limitParam = (request.query as { limit?: string }).limit;
    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 50, 100) : 50;

    const activities = await getRecentActivities(id, { since, limit });
    return reply.send({
      activities,
      count: activities.length,
      timestamp: new Date().toISOString(),
    });
  });
};

export default activityRestRoute;
