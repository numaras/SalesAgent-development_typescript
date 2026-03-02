/**
 * Sync API for inventory/sync jobs. Parity with _legacy/src/admin/sync_api.py
 * Register with prefix: /api/v1/sync
 * Auth: X-API-Key header (stored in superadmin_config with config_key = 'api_key').
 */
import { and, desc, eq, gte, ilike, or, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../db/client.js";
import { enqueueGamSync } from "../../jobs/queues.js";
import { adapterConfigs } from "../../db/schema/adapterConfigs.js";
import { gamLineItems } from "../../db/schema/gamInventory.js";
import { gamOrders } from "../../db/schema/gamInventory.js";
import { syncJobs } from "../../db/schema/syncJobs.js";
import { tenantManagementConfig } from "../../db/schema/tenantManagementConfig.js";
import { tenants } from "../../db/schema/tenants.js";

const SYNC_API_KEY_CONFIG = "api_key";

function getHeader(headers: Record<string, string | string[] | undefined>, name: string): string | undefined {
  const v = headers[name];
  return Array.isArray(v) ? v[0] : v;
}

async function requireSyncApiKey(
  request: { headers: Record<string, string | string[] | undefined> },
  reply: { code: (n: number) => { send: (p: object) => unknown } }
): Promise<boolean> {
  const apiKey = getHeader(request.headers, "x-api-key");
  if (!apiKey) {
    reply.code(401).send({ error: "API key required" });
    return false;
  }
  const [row] = await db
    .select({ configValue: tenantManagementConfig.configValue })
    .from(tenantManagementConfig)
    .where(eq(tenantManagementConfig.configKey, SYNC_API_KEY_CONFIG))
    .limit(1);
  if (!row?.configValue || apiKey !== row.configValue) {
    reply.code(401).send({ error: "Invalid API key" });
    return false;
  }
  return true;
}

const syncApiRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post("/trigger/:id", async (request, reply) => {
    if (!(await requireSyncApiKey(request, reply))) return;
    const { id: tenantId } = request.params as { id: string };

    const [tenant] = await db.select().from(tenants).where(eq(tenants.tenantId, tenantId)).limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    if (tenant.adServer !== "google_ad_manager") {
      return reply.code(400).send({ error: "Only Google Ad Manager sync is currently supported" });
    }

    const [adapter] = await db
      .select()
      .from(adapterConfigs)
      .where(eq(adapterConfigs.tenantId, tenantId))
      .limit(1);
    if (!adapter) return reply.code(400).send({ error: "Adapter not configured" });

    const body = (request.body ?? {}) as Record<string, unknown>;
    const syncType = typeof body.sync_type === "string" ? body.sync_type : "full";

    const syncId = `sync_${tenantId}_${Math.floor(Date.now() / 1000)}`;
    await db.insert(syncJobs).values({
      syncId,
      tenantId,
      adapterType: "google_ad_manager",
      syncType,
      status: "pending",
      startedAt: new Date(),
      triggeredBy: "api",
      triggeredById: "tenant_management_api",
    });

    // Enqueue the sync job for asynchronous processing by the BullMQ worker
    await enqueueGamSync({ syncId, tenantId, syncType });

    return reply.send({
      sync_id: syncId,
      status: "pending",
      message: "Sync job queued. Poll /status/:sync_id to track progress.",
    });
  });

  fastify.get("/status/:sync_id", async (request, reply) => {
    if (!(await requireSyncApiKey(request, reply))) return;
    const { sync_id } = request.params as { sync_id: string };

    const [job] = await db.select().from(syncJobs).where(eq(syncJobs.syncId, sync_id)).limit(1);
    if (!job) return reply.code(404).send({ error: "Sync job not found" });

    const out: Record<string, unknown> = {
      sync_id: job.syncId,
      tenant_id: job.tenantId,
      adapter_type: job.adapterType,
      sync_type: job.syncType,
      status: job.status,
      started_at: job.startedAt?.toISOString() ?? null,
      triggered_by: job.triggeredBy,
      triggered_by_id: job.triggeredById,
    };
    if (job.completedAt) {
      out.completed_at = job.completedAt.toISOString();
      out.duration_seconds =
        job.startedAt && job.completedAt
          ? (job.completedAt.getTime() - job.startedAt.getTime()) / 1000
          : null;
    }
    if (job.summary) {
      try {
        out.summary = JSON.parse(job.summary);
      } catch {
        out.summary = job.summary;
      }
    }
    if (job.errorMessage) out.error = job.errorMessage;
    return reply.send(out);
  });

  fastify.get("/history/:id", async (request, reply) => {
    if (!(await requireSyncApiKey(request, reply))) return;
    const { id: tenantId } = request.params as { id: string };
    const query = request.query as { limit?: string; offset?: string; status?: string };
    const limit = Math.min(parseInt(query.limit ?? "10", 10) || 10, 100);
    const offset = parseInt(query.offset ?? "0", 10) || 0;
    const statusFilter = query.status;

    const whereClause = statusFilter
      ? and(eq(syncJobs.tenantId, tenantId), eq(syncJobs.status, statusFilter))
      : eq(syncJobs.tenantId, tenantId);

    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(syncJobs)
      .where(whereClause);
    const total = countResult[0]?.count ?? 0;

    const jobs = await db
      .select()
      .from(syncJobs)
      .where(whereClause)
      .orderBy(desc(syncJobs.startedAt))
      .limit(limit)
      .offset(offset);

    const results = jobs.map((job) => {
      const r: Record<string, unknown> = {
        sync_id: job.syncId,
        sync_type: job.syncType,
        status: job.status,
        started_at: job.startedAt?.toISOString() ?? null,
        triggered_by: job.triggeredBy,
        triggered_by_id: job.triggeredById,
      };
      if (job.completedAt) {
        r.completed_at = job.completedAt.toISOString();
        r.duration_seconds =
          job.startedAt && job.completedAt
            ? (job.completedAt.getTime() - job.startedAt.getTime()) / 1000
            : null;
      }
      if (job.summary) {
        try {
          r.summary = JSON.parse(job.summary);
        } catch {
          r.summary = job.summary;
        }
      }
      if (job.errorMessage) r.error = job.errorMessage;
      return r;
    });

    return reply.send({ total, limit, offset, results });
  });

  fastify.get("/tenants", async (request, reply) => {
    if (!(await requireSyncApiKey(request, reply))) return;

    const gamTenants = await db
      .select()
      .from(tenants)
      .where(eq(tenants.adServer, "google_ad_manager"));

    const results: Array<Record<string, unknown>> = [];
    for (const tenant of gamTenants) {
      const [adapter] = await db
        .select()
        .from(adapterConfigs)
        .where(eq(adapterConfigs.tenantId, tenant.tenantId))
        .limit(1);
      const [lastSync] = await db
        .select()
        .from(syncJobs)
        .where(and(eq(syncJobs.tenantId, tenant.tenantId), eq(syncJobs.status, "completed")))
        .orderBy(desc(syncJobs.completedAt))
        .limit(1);

      results.push({
        tenant_id: tenant.tenantId,
        name: tenant.name,
        subdomain: tenant.subdomain,
        has_adapter_config: !!adapter,
        gam_network_code: adapter?.gamNetworkCode ?? null,
        last_sync: lastSync
          ? {
              sync_id: lastSync.syncId,
              completed_at: lastSync.completedAt?.toISOString() ?? null,
              summary: lastSync.summary ? (() => { try { return JSON.parse(lastSync.summary); } catch { return lastSync.summary; } })() : null,
            }
          : null,
      });
    }
    return reply.send({ total: results.length, tenants: results });
  });

  fastify.get("/stats", async (request, reply) => {
    if (!(await requireSyncApiKey(request, reply))) return;

    const since = new Date();
    since.setHours(0, 0, 0, 0);

    const statusCounts: Record<string, number> = {};
    for (const status of ["pending", "running", "completed", "failed"]) {
      const [r] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(syncJobs)
        .where(and(eq(syncJobs.status, status), gte(syncJobs.startedAt, since)));
      statusCounts[status] = r?.count ?? 0;
    }

    const recentFailures = await db
      .select()
      .from(syncJobs)
      .where(and(eq(syncJobs.status, "failed"), gte(syncJobs.startedAt, since)))
      .orderBy(desc(syncJobs.startedAt))
      .limit(5);

    const gamTenants = await db
      .select()
      .from(tenants)
      .where(eq(tenants.adServer, "google_ad_manager"));

    const staleTenants: Array<Record<string, unknown>> = [];
    for (const tenant of gamTenants) {
      const [lastSync] = await db
        .select()
        .from(syncJobs)
        .where(and(eq(syncJobs.tenantId, tenant.tenantId), eq(syncJobs.status, "completed")))
        .orderBy(desc(syncJobs.completedAt))
        .limit(1);
      const needsSync =
        !lastSync ||
        (lastSync.completedAt &&
          (Date.now() - lastSync.completedAt.getTime()) / (24 * 60 * 60 * 1000) > 1);
      if (needsSync) {
        staleTenants.push({
          tenant_id: tenant.tenantId,
          tenant_name: tenant.name,
          last_sync: lastSync?.completedAt?.toISOString() ?? null,
        });
      }
    }

    return reply.send({
      status_counts: statusCounts,
      recent_failures: recentFailures.map((j) => ({
        sync_id: j.syncId,
        tenant_id: j.tenantId,
        started_at: j.startedAt?.toISOString() ?? null,
        error: j.errorMessage,
      })),
      stale_tenants: staleTenants,
      since: since.toISOString(),
    });
  });
  // ── Orders sync (stub — GAM client not migrated) ──────────────────────────
  fastify.post("/tenant/:id/orders/sync", async (request, reply) => {
    if (!(await requireSyncApiKey(request, reply))) return;
    const { id: tenantId } = request.params as { id: string };

    const [tenant] = await db.select().from(tenants).where(eq(tenants.tenantId, tenantId)).limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const [adapter] = await db
      .select()
      .from(adapterConfigs)
      .where(and(eq(adapterConfigs.tenantId, tenantId), eq(adapterConfigs.adapterType, "google_ad_manager")))
      .limit(1);
    if (!adapter?.gamNetworkCode) {
      return reply.code(400).send({
        error: "Please connect your GAM account first. Go to Ad Server settings to configure GAM.",
      });
    }

    const syncId = `orders_sync_${tenantId}_${Math.floor(Date.now() / 1000)}`;
    await db.insert(syncJobs).values({
      syncId,
      tenantId,
      adapterType: "google_ad_manager",
      syncType: "orders",
      status: "running",
      startedAt: new Date(),
      triggeredBy: "api",
      triggeredById: "tenant_management_api",
    });

    // Enqueue the orders sync job for asynchronous processing by the BullMQ worker
    await enqueueGamSync({ syncId, tenantId, syncType: "orders" });

    return reply.send({
      sync_id: syncId,
      status: "pending",
      message: "Orders sync job queued. Poll /status/:sync_id to track progress.",
    });
  });

  // ── Get tenant orders ──────────────────────────────────────────────────────
  fastify.get("/tenant/:id/orders", async (request, reply) => {
    if (!(await requireSyncApiKey(request, reply))) return;
    const { id: tenantId } = request.params as { id: string };

    if (!tenantId || tenantId.length > 50) return reply.code(400).send({ error: "Invalid tenant_id" });

    const query = request.query as {
      status?: string;
      advertiser_id?: string;
      search?: string;
      has_line_items?: string;
    };

    const VALID_ORDER_STATUSES = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "PAUSED", "CANCELED", "DELETED"];

    if (query.status && !VALID_ORDER_STATUSES.includes(query.status)) {
      return reply.code(400).send({ error: `Invalid status. Must be one of: ${VALID_ORDER_STATUSES.join(", ")}` });
    }
    if (query.advertiser_id && (!/^[a-zA-Z0-9]+$/.test(query.advertiser_id) || query.advertiser_id.length > 50)) {
      return reply.code(400).send({ error: "Invalid advertiser_id" });
    }
    if (query.search && query.search.length > 200) {
      return reply.code(400).send({ error: "Search string too long (max 200 characters)" });
    }
    if (query.has_line_items && !["true", "false"].includes(query.has_line_items)) {
      return reply.code(400).send({ error: 'has_line_items must be "true" or "false"' });
    }

    const conditions = [eq(gamOrders.tenantId, tenantId)];
    if (query.status) conditions.push(eq(gamOrders.status, query.status));
    if (query.advertiser_id) conditions.push(eq(gamOrders.advertiserId, query.advertiser_id));
    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(
        or(
          ilike(gamOrders.name, term),
          ilike(gamOrders.poNumber, term),
          ilike(gamOrders.externalOrderId, term),
          ilike(gamOrders.advertiserName, term),
        )!,
      );
    }

    const rows = await db
      .select()
      .from(gamOrders)
      .where(and(...conditions))
      .orderBy(desc(gamOrders.lastModifiedDate));

    const lineItemCounts = await db
      .select({ orderId: gamLineItems.orderId, count: sql<number>`count(*)::int` })
      .from(gamLineItems)
      .where(eq(gamLineItems.tenantId, tenantId))
      .groupBy(gamLineItems.orderId);
    const countByOrder = Object.fromEntries(lineItemCounts.map((r) => [r.orderId, r.count]));

    let orders = rows.map((o) => ({
      order_id: o.orderId,
      name: o.name,
      advertiser_id: o.advertiserId,
      advertiser_name: o.advertiserName,
      agency_id: o.agencyId,
      agency_name: o.agencyName,
      trafficker_id: o.traffickerId,
      trafficker_name: o.traffickerName,
      salesperson_id: o.salespersonId,
      salesperson_name: o.salespersonName,
      status: o.status,
      start_date: o.startDate?.toISOString() ?? null,
      end_date: o.endDate?.toISOString() ?? null,
      unlimited_end_date: o.unlimitedEndDate,
      total_budget: o.totalBudget,
      currency_code: o.currencyCode,
      external_order_id: o.externalOrderId,
      po_number: o.poNumber,
      notes: o.notes,
      last_modified_date: o.lastModifiedDate?.toISOString() ?? null,
      is_programmatic: o.isProgrammatic,
      applied_labels: o.appliedLabels,
      custom_field_values: o.customFieldValues,
      last_synced: o.lastSynced?.toISOString() ?? null,
      line_item_count: countByOrder[o.orderId] ?? 0,
      has_line_items: (countByOrder[o.orderId] ?? 0) > 0,
    }));

    if (query.has_line_items === "true") orders = orders.filter((o) => o.has_line_items);
    else if (query.has_line_items === "false") orders = orders.filter((o) => !o.has_line_items);

    return reply.send({ total: orders.length, orders });
  });

  // ── Get order details ──────────────────────────────────────────────────────
  fastify.get("/tenant/:id/orders/:order_id", async (request, reply) => {
    if (!(await requireSyncApiKey(request, reply))) return;
    const { id: tenantId, order_id: orderId } = request.params as { id: string; order_id: string };

    if (!tenantId || tenantId.length > 50) return reply.code(400).send({ error: "Invalid tenant_id" });
    if (!orderId || orderId.length > 50) return reply.code(400).send({ error: "Invalid order_id" });

    const [order] = await db
      .select()
      .from(gamOrders)
      .where(and(eq(gamOrders.tenantId, tenantId), eq(gamOrders.orderId, orderId)))
      .limit(1);
    if (!order) return reply.code(404).send({ error: "Order not found" });

    const lineItems = await db
      .select()
      .from(gamLineItems)
      .where(and(eq(gamLineItems.tenantId, tenantId), eq(gamLineItems.orderId, orderId)));

    const lineItemDicts = lineItems.map((li) => {
      const deliveryPct =
        li.primaryGoalType === "IMPRESSIONS" && li.primaryGoalUnits && li.statsImpressions
          ? Math.round((li.statsImpressions / li.primaryGoalUnits) * 10000) / 100
          : 0;
      return {
        line_item_id: li.lineItemId,
        order_id: li.orderId,
        name: li.name,
        status: li.status,
        line_item_type: li.lineItemType,
        priority: li.priority,
        start_date: li.startDate?.toISOString() ?? null,
        end_date: li.endDate?.toISOString() ?? null,
        unlimited_end_date: li.unlimitedEndDate,
        cost_type: li.costType,
        cost_per_unit: li.costPerUnit,
        discount_type: li.discountType,
        discount: li.discount,
        delivery_rate_type: li.deliveryRateType,
        primary_goal_type: li.primaryGoalType,
        primary_goal_units: li.primaryGoalUnits,
        environment_type: li.environmentType,
        stats_impressions: li.statsImpressions,
        stats_clicks: li.statsClicks,
        stats_ctr: li.statsCtr,
        delivery_indicator_type: li.deliveryIndicatorType,
        delivery_percentage: deliveryPct,
        targeting: li.targeting,
        creative_placeholders: li.creativePlaceholders,
        last_modified_date: li.lastModifiedDate?.toISOString() ?? null,
        creation_date: li.creationDate?.toISOString() ?? null,
        last_synced: li.lastSynced?.toISOString() ?? null,
      };
    });

    const totalImpressions = lineItems.reduce((s, li) => s + (li.statsImpressions ?? 0), 0);
    const totalClicks = lineItems.reduce((s, li) => s + (li.statsClicks ?? 0), 0);
    const activeCount = lineItems.filter((li) => li.status === "APPROVED").length;
    const totalSpend = lineItems.reduce((s, li) => {
      if (li.costType === "CPM" && li.costPerUnit && li.statsImpressions)
        return s + (li.statsImpressions / 1000) * li.costPerUnit;
      return s;
    }, 0);

    return reply.send({
      order_id: order.orderId,
      name: order.name,
      advertiser_id: order.advertiserId,
      advertiser_name: order.advertiserName,
      agency_id: order.agencyId,
      agency_name: order.agencyName,
      trafficker_id: order.traffickerId,
      trafficker_name: order.traffickerName,
      salesperson_id: order.salespersonId,
      salesperson_name: order.salespersonName,
      status: order.status,
      start_date: order.startDate?.toISOString() ?? null,
      end_date: order.endDate?.toISOString() ?? null,
      unlimited_end_date: order.unlimitedEndDate,
      total_budget: order.totalBudget,
      currency_code: order.currencyCode,
      external_order_id: order.externalOrderId,
      po_number: order.poNumber,
      notes: order.notes,
      last_modified_date: order.lastModifiedDate?.toISOString() ?? null,
      is_programmatic: order.isProgrammatic,
      applied_labels: order.appliedLabels,
      custom_field_values: order.customFieldValues,
      last_synced: order.lastSynced?.toISOString() ?? null,
      line_items: lineItemDicts,
      stats: {
        total_line_items: lineItems.length,
        active_line_items: activeCount,
        total_impressions: totalImpressions,
        total_clicks: totalClicks,
        total_spend: Math.round(totalSpend * 100) / 100,
      },
    });
  });

  // ── Get tenant line items ──────────────────────────────────────────────────
  fastify.get("/tenant/:id/line-items", async (request, reply) => {
    if (!(await requireSyncApiKey(request, reply))) return;
    const { id: tenantId } = request.params as { id: string };

    const query = request.query as {
      status?: string;
      line_item_type?: string;
      search?: string;
      order_id?: string;
    };

    const conditions = [eq(gamLineItems.tenantId, tenantId)];
    if (query.status) conditions.push(eq(gamLineItems.status, query.status));
    if (query.line_item_type) conditions.push(eq(gamLineItems.lineItemType, query.line_item_type));
    if (query.search) conditions.push(ilike(gamLineItems.name, `%${query.search}%`));
    if (query.order_id) conditions.push(eq(gamLineItems.orderId, query.order_id));

    const rows = await db
      .select()
      .from(gamLineItems)
      .where(and(...conditions))
      .orderBy(desc(gamLineItems.lastModifiedDate));

    const lineItems = rows.map((li) => {
      const deliveryPct =
        li.primaryGoalType === "IMPRESSIONS" && li.primaryGoalUnits && li.statsImpressions
          ? Math.round((li.statsImpressions / li.primaryGoalUnits) * 10000) / 100
          : 0;
      return {
        line_item_id: li.lineItemId,
        order_id: li.orderId,
        name: li.name,
        status: li.status,
        line_item_type: li.lineItemType,
        priority: li.priority,
        start_date: li.startDate?.toISOString() ?? null,
        end_date: li.endDate?.toISOString() ?? null,
        unlimited_end_date: li.unlimitedEndDate,
        cost_type: li.costType,
        cost_per_unit: li.costPerUnit,
        discount_type: li.discountType,
        discount: li.discount,
        delivery_rate_type: li.deliveryRateType,
        primary_goal_type: li.primaryGoalType,
        primary_goal_units: li.primaryGoalUnits,
        environment_type: li.environmentType,
        stats_impressions: li.statsImpressions,
        stats_clicks: li.statsClicks,
        stats_ctr: li.statsCtr,
        delivery_indicator_type: li.deliveryIndicatorType,
        delivery_percentage: deliveryPct,
        targeting: li.targeting,
        creative_placeholders: li.creativePlaceholders,
        last_modified_date: li.lastModifiedDate?.toISOString() ?? null,
        creation_date: li.creationDate?.toISOString() ?? null,
        last_synced: li.lastSynced?.toISOString() ?? null,
      };
    });

    return reply.send({ total: lineItems.length, line_items: lineItems });
  });
};

export default syncApiRoute;
