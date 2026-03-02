/**
 * GAM reporting base endpoint. Parity with _legacy gam_reporting_api.get_gam_reporting.
 * GET /api/tenant/:id/gam/reporting
 */
import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { adapterConfigs } from "../../../db/schema/adapterConfigs.js";
import { tenants } from "../../../db/schema/tenants.js";
import { gamReportingBaseRouteSchema } from "../../../routes/schemas/admin/gamReporting/base.schema.js";
import { requireTenantAccess } from "../../services/authGuard.js";

const DATE_RANGES = ["lifetime", "this_month", "today"] as const;
const NUMERIC_ID = /^\d+$/;

function validateTenantId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id) && id.length <= 100;
}
function validateNumericId(id: string): boolean {
  return NUMERIC_ID.test(id) && id.length <= 20;
}

const baseRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/api/tenant/:id/gam/reporting", { schema: gamReportingBaseRouteSchema }, async (request, reply) => {
    const { id: tenantId } = request.params as { id: string };

    if (!validateTenantId(tenantId)) return reply.code(400).send({ error: "Invalid tenant ID format" });
    if (!(await requireTenantAccess(request, reply, tenantId))) return;

    const [tenant] = await db.select().from(tenants).where(eq(tenants.tenantId, tenantId)).limit(1);
    if (!tenant || tenant.adServer !== "google_ad_manager") {
      return reply.code(400).send({ error: "GAM reporting is only available for tenants using Google Ad Manager" });
    }

    const dateRange = (request.query as { date_range?: string }).date_range;
    if (!dateRange || !DATE_RANGES.includes(dateRange as typeof DATE_RANGES[number])) {
      return reply.code(400).send({
        error: "Invalid or missing date_range. Must be one of: lifetime, this_month, today",
      });
    }

    const advertiserId = (request.query as { advertiser_id?: string }).advertiser_id;
    if (advertiserId && !validateNumericId(advertiserId)) {
      return reply.code(400).send({ error: "Invalid advertiser_id format" });
    }
    const orderId = (request.query as { order_id?: string }).order_id;
    if (orderId && !validateNumericId(orderId)) return reply.code(400).send({ error: "Invalid order_id format" });
    const lineItemId = (request.query as { line_item_id?: string }).line_item_id;
    if (lineItemId && !validateNumericId(lineItemId)) {
      return reply.code(400).send({ error: "Invalid line_item_id format" });
    }

    const timezone = (request.query as { timezone?: string }).timezone ?? "America/New_York";
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
    } catch {
      return reply.code(400).send({ error: "Invalid timezone" });
    }

    try {
      const [adapterConfig] = await db
        .select()
        .from(adapterConfigs)
        .where(eq(adapterConfigs.tenantId, tenantId))
        .limit(1);

      const hasOAuth = Boolean(adapterConfig?.gamRefreshToken);
      const hasServiceAccount = Boolean(adapterConfig?.gamServiceAccountJson);
      if (!adapterConfig || (!hasOAuth && !hasServiceAccount)) {
        return reply.code(500).send({ error: "GAM client not configured for this tenant" });
      }

      const networkTimezone = adapterConfig.gamNetworkTimezone ?? timezone;

      const now = new Date();
      const start = new Date(now);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);

      // GAM reporting service not yet migrated to TypeScript.
      return reply.send({
        success: true,
        data: [],
        metadata: {
          start_date: start.toISOString(),
          end_date: now.toISOString(),
          requested_timezone: timezone,
          data_timezone: networkTimezone,
          data_valid_until: now.toISOString(),
          query_type: "stub",
          dimensions: [],
          metrics: [],
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.code(500).send({ error: `Failed to get reporting data: ${message}` });
    }
  });
};

export default baseRoute;
