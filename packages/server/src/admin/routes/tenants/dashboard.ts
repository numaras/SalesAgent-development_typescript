import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { creatives } from "../../../db/schema/creatives.js";
import { mediaBuys } from "../../../db/schema/mediaBuys.js";
import { principals } from "../../../db/schema/principals.js";
import { products } from "../../../db/schema/products.js";
import { tenants } from "../../../db/schema/tenants.js";
import { tenantAuthConfigs } from "../../../db/schema/users.js";
import { requireTenantAccess } from "../../services/authGuard.js";

/**
 * Build a 30-day daily revenue trend array from a set of active/completed media buys.
 * Mirrors Python DashboardService._calculate_revenue_trend().
 * Each buy's budget is spread evenly across its flight days; only days that fall
 * within the 30-day window count.
 */
function buildRevenueTrend(
  buys: { budget: string | null; startDate: string; endDate: string }[],
  days = 30,
): { date: string; revenue: number }[] {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const trend: { date: string; revenue: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = d.toISOString().slice(0, 10);

    let dailyRevenue = 0;
    for (const buy of buys) {
      if (!buy.budget || !buy.startDate || !buy.endDate) continue;
      const start = new Date(buy.startDate);
      const end = new Date(buy.endDate);
      if (d < start || d > end) continue;
      const flightDays =
        Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
      if (flightDays > 0) {
        dailyRevenue += parseFloat(buy.budget) / flightDays;
      }
    }
    trend.push({ date: dateStr, revenue: Math.round(dailyRevenue * 100) / 100 });
  }
  return trend;
}

/**
 * Calculate revenue change percentage: last 7 days vs previous 7 days.
 * Mirrors Python DashboardService._calculate_revenue_change().
 */
function calcRevenueChange(trend: { revenue: number }[]): number {
  if (trend.length < 14) return 0;
  const last7 = trend.slice(-7).reduce((s, d) => s + d.revenue, 0);
  const prev7 = trend.slice(-14, -7).reduce((s, d) => s + d.revenue, 0);
  if (prev7 > 0) {
    return Math.round(((last7 - prev7) / prev7) * 100 * 10) / 10;
  }
  return 0;
}

const tenantDashboardRoute: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  fastify.get("/tenant/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const hasAccess = await requireTenantAccess(request, reply, id);
    if (!hasAccess) return;

    const [tenant] = await db
      .select({
        tenantId: tenants.tenantId,
        name: tenants.name,
        isActive: tenants.isActive,
        adServer: tenants.adServer,
      })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);
    if (!tenant) {
      return reply.code(404).send({ error: "Tenant not found" });
    }

    // Core metrics
    const [productsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(eq(products.tenantId, id));
    const [principalsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(principals)
      .where(eq(principals.tenantId, id));
    const [activeCampaigns] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(mediaBuys)
      .where(and(eq(mediaBuys.tenantId, id), eq(mediaBuys.status, "active")));
    const [scheduledCampaigns] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(mediaBuys)
      .where(and(eq(mediaBuys.tenantId, id), eq(mediaBuys.status, "scheduled")));
    const [totalSpend] = await db
      .select({ total: sql<string>`coalesce(sum(${mediaBuys.budget}), 0)` })
      .from(mediaBuys)
      .where(
        and(
          eq(mediaBuys.tenantId, id),
          inArray(mediaBuys.status, ["active", "completed"]),
        ),
      );

    // Needs attention: failed buys + pending_review creatives
    const [failedBuys] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(mediaBuys)
      .where(and(eq(mediaBuys.tenantId, id), eq(mediaBuys.status, "failed")));
    const [pendingCreatives] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(creatives)
      .where(
        and(
          eq(creatives.tenantId, id),
          inArray(creatives.status, ["pending_review", "pending"]),
        ),
      );
    const pendingCreativesCount = pendingCreatives?.count ?? 0;
    const failedBuysCount = failedBuys?.count ?? 0;
    const needsAttention = failedBuysCount + pendingCreativesCount;

    // Revenue trend (30 days) for chart and revenue_change
    const activeBuys = await db
      .select({
        budget: mediaBuys.budget,
        startDate: mediaBuys.startDate,
        endDate: mediaBuys.endDate,
      })
      .from(mediaBuys)
      .where(
        and(
          eq(mediaBuys.tenantId, id),
          inArray(mediaBuys.status, ["active", "completed"]),
        ),
      );
    const revenueTrend = buildRevenueTrend(activeBuys);
    const revenueChange = calcRevenueChange(revenueTrend);

    // Recent media buys
    const recentMediaBuys = await db
      .select({
        media_buy_id: mediaBuys.mediaBuyId,
        order_name: mediaBuys.orderName,
        advertiser_name: mediaBuys.advertiserName,
        status: mediaBuys.status,
        budget: mediaBuys.budget,
        created_at: mediaBuys.createdAt,
      })
      .from(mediaBuys)
      .where(eq(mediaBuys.tenantId, id))
      .orderBy(desc(mediaBuys.createdAt))
      .limit(10);

    // Setup status (mirrors SetupChecklistService simplified checks)
    const [oidc] = await db
      .select({
        oidcEnabled: tenantAuthConfigs.oidcEnabled,
        oidcClientId: tenantAuthConfigs.oidcClientId,
      })
      .from(tenantAuthConfigs)
      .where(eq(tenantAuthConfigs.tenantId, id))
      .limit(1);
    const [hasProducts] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(products)
      .where(eq(products.tenantId, id))
      .limit(1);
    const [hasPrincipals] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(principals)
      .where(eq(principals.tenantId, id))
      .limit(1);
    const [hasMediaBuys] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(mediaBuys)
      .where(eq(mediaBuys.tenantId, id))
      .limit(1);
    const setupStatus = {
      auth_configured: Boolean(oidc?.oidcClientId),
      auth_enabled: Boolean(oidc?.oidcEnabled),
      ad_server_configured: Boolean(tenant.adServer),
      has_products: (hasProducts?.n ?? 0) > 0,
      has_principals: (hasPrincipals?.n ?? 0) > 0,
      has_media_buys: (hasMediaBuys?.n ?? 0) > 0,
    };

    return reply.send({
      tenant: {
        tenant_id: tenant.tenantId,
        name: tenant.name,
        is_active: tenant.isActive,
      },
      tenant_id: id,
      metrics: {
        live_buys: activeCampaigns?.count ?? 0,
        scheduled_buys: scheduledCampaigns?.count ?? 0,
        total_revenue: Number(totalSpend?.total ?? 0),
        total_advertisers: principalsCount?.count ?? 0,
        active_advertisers: principalsCount?.count ?? 0,
        products_count: productsCount?.count ?? 0,
        needs_attention: needsAttention,
        pending_creatives_review: pendingCreativesCount,
        failed_buys: failedBuysCount,
        revenue_change: revenueChange,
        revenue_change_abs: Math.abs(revenueChange),
        revenue_data: revenueTrend,
      },
      recent_media_buys: recentMediaBuys,
      recent_buys: recentMediaBuys,
      chart_labels: revenueTrend.map((d) => d.date),
      chart_data: revenueTrend.map((d) => d.revenue),
      revenue_data: revenueTrend,
      features: {},
      setup_status: setupStatus,
    });
  });
};

export default tenantDashboardRoute;
