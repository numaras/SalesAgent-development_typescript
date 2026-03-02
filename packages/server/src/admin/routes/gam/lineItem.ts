import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { adapterConfigs } from "../../../db/schema/adapterConfigs.js";
import { gamLineItems, gamOrders } from "../../../db/schema/gamInventory.js";
import { tenants } from "../../../db/schema/tenants.js";
import {
  lineItemApiRouteSchema,
  lineItemViewRouteSchema,
} from "../../../routes/schemas/admin/gam/lineItem.schema.js";
import { requireTenantAccess } from "../../services/authGuard.js";

function mapLineItem(li: typeof gamLineItems.$inferSelect) {
  const deliveryPct =
    li.primaryGoalType === "IMPRESSIONS" && li.primaryGoalUnits && li.statsImpressions
      ? Math.round((li.statsImpressions / li.primaryGoalUnits) * 10000) / 100
      : 0;
  return {
    line_item_id: li.lineItemId,
    order_id: li.orderId,
    name: li.name,
    status: li.status,
    type: li.lineItemType,
    priority: li.priority,
    cost_type: li.costType,
    cost_per_unit: li.costPerUnit,
    currency: null,
    goal_type: li.primaryGoalType,
    goal_units: li.primaryGoalUnits,
    units_delivered: li.statsImpressions ?? 0,
    impressions_delivered: li.statsImpressions ?? 0,
    clicks_delivered: li.statsClicks ?? 0,
    ctr: li.statsCtr ?? 0,
    delivery_percentage: deliveryPct,
    start_date: li.startDate?.toISOString() ?? null,
    end_date: li.endDate?.toISOString() ?? null,
    last_synced: li.lastSynced?.toISOString() ?? null,
    targeting: li.targeting,
    raw_data: null,
  };
}

const lineItemRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // HTML route — mirrors Python @require_tenant_access() gam.py L475
  fastify.get("/tenant/:id/gam/line-item/:lineItemId", { schema: lineItemViewRouteSchema }, async (request, reply) => {
    const { id, lineItemId } = request.params as { id: string; lineItemId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const [tenant] = await db
      .select({ tenantId: tenants.tenantId, name: tenants.name })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const [adapterConfig] = await db
      .select({
        gamNetworkCode: adapterConfigs.gamNetworkCode,
        gamRefreshToken: adapterConfigs.gamRefreshToken,
        gamServiceAccountJson: adapterConfigs.gamServiceAccountJson,
      })
      .from(adapterConfigs)
      .where(eq(adapterConfigs.tenantId, id))
      .limit(1);

    if (!adapterConfig?.gamNetworkCode || (!adapterConfig.gamRefreshToken && !adapterConfig.gamServiceAccountJson)) {
      return reply.code(400).send({
        error: "Please connect your GAM account first. Go to Ad Server settings to configure GAM.",
      });
    }

    const [li] = await db
      .select()
      .from(gamLineItems)
      .where(and(eq(gamLineItems.tenantId, id), eq(gamLineItems.lineItemId, lineItemId)))
      .limit(1);

    if (!li) {
      return reply.code(404).send({ error: "Line item not found. Run a GAM sync to import line items." });
    }

    const lineItem = mapLineItem(li);

    let order = null;
    if (li.orderId) {
      const [orderRow] = await db
        .select({
          orderId: gamOrders.orderId,
          name: gamOrders.name,
          advertiserId: gamOrders.advertiserId,
          advertiserName: gamOrders.advertiserName,
          status: gamOrders.status,
          startDate: gamOrders.startDate,
          endDate: gamOrders.endDate,
        })
        .from(gamOrders)
        .where(and(eq(gamOrders.tenantId, id), eq(gamOrders.orderId, li.orderId)))
        .limit(1);
      if (orderRow) order = orderRow;
    }

    return reply.send({
      tenant: { tenant_id: tenant.tenantId, name: tenant.name },
      tenant_id: id,
      line_item: lineItem,
      order,
    });
  });

  // API route — mirrors Python @require_tenant_access(api_mode=True) gam.py L1104
  fastify.get("/tenant/:id/gam/api/line-item/:lineItemId", { schema: lineItemApiRouteSchema }, async (request, reply) => {
    const { id, lineItemId } = request.params as { id: string; lineItemId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const [tenant] = await db
      .select({ tenantId: tenants.tenantId })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);
    if (!tenant) return reply.code(404).send({ success: false, error: "Tenant not found" });

    const [adapterConfig] = await db
      .select({
        gamNetworkCode: adapterConfigs.gamNetworkCode,
        gamRefreshToken: adapterConfigs.gamRefreshToken,
        gamServiceAccountJson: adapterConfigs.gamServiceAccountJson,
      })
      .from(adapterConfigs)
      .where(eq(adapterConfigs.tenantId, id))
      .limit(1);

    if (!adapterConfig?.gamNetworkCode || (!adapterConfig.gamRefreshToken && !adapterConfig.gamServiceAccountJson)) {
      return reply.code(400).send({
        success: false,
        error: "Please connect your GAM account first. Go to Ad Server settings to configure GAM.",
      });
    }

    const [li] = await db
      .select()
      .from(gamLineItems)
      .where(and(eq(gamLineItems.tenantId, id), eq(gamLineItems.lineItemId, lineItemId)))
      .limit(1);

    if (!li) {
      return reply.code(404).send({
        success: false,
        error: "Line item not found. Run a GAM sync to import line items.",
      });
    }

    return reply.send({ success: true, line_item: mapLineItem(li) });
  });
};

export default lineItemRoute;
