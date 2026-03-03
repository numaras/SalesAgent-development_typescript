/**
 * GAM reporting breakdown endpoints. Parity with _legacy gam_reporting_api:
 * GET .../gam/reporting/countries, .../ad-units, .../advertiser/:adv_id/summary
 */
import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { adapterConfigs } from "../../../db/schema/adapterConfigs.js";
import { tenants } from "../../../db/schema/tenants.js";
import {
  gamReportingAdUnitsRouteSchema,
  gamReportingAdvertiserSummaryRouteSchema,
  gamReportingCountriesRouteSchema,
} from "../../../routes/schemas/admin/gamReporting/breakdown.schema.js";
import {
  getAdUnitBreakdown,
  getAdvertiserSummary,
  getCountryBreakdown,
  type ReportingDateRange,
} from "../../services/gamReportingService.js";
import { requireTenantAccess } from "../../services/authGuard.js";
import {
  fetchLiveGamAdUnitBreakdown,
  fetchLiveGamAdvertiserSummary,
  fetchLiveGamCountryBreakdown,
} from "../../../services/gamLiveReportingService.js";

const DATE_RANGES = ["lifetime", "this_month", "today"] as const;
const NUMERIC_ID = /^\d+$/;

function validateTenantId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id) && id.length <= 100;
}
function validateNumericId(id: string): boolean {
  return NUMERIC_ID.test(id) && id.length <= 20;
}

type GamTenantContext = {
  tenant: typeof tenants.$inferSelect;
  adapterConfig: typeof adapterConfigs.$inferSelect;
};

const breakdownRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  async function ensureGamTenant(
    tenantId: string,
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<GamTenantContext | null> {
    if (!validateTenantId(tenantId)) {
      reply.code(400).send({ error: "Invalid tenant ID format" });
      return null;
    }
    if (!(await requireTenantAccess(request, reply, tenantId))) return null;

    const [tenant] = await db.select().from(tenants).where(eq(tenants.tenantId, tenantId)).limit(1);
    if (!tenant || tenant.adServer !== "google_ad_manager") {
      reply.code(400).send({ error: "GAM reporting is only available for tenants using Google Ad Manager" });
      return null;
    }

    const [adapterConfig] = await db
      .select()
      .from(adapterConfigs)
      .where(eq(adapterConfigs.tenantId, tenantId))
      .limit(1);

    return { tenant, adapterConfig };
  }

  function ensureGamClient(
    ctx: GamTenantContext,
    reply: FastifyReply
  ): boolean {
    const hasOAuth = Boolean(ctx.adapterConfig?.gamRefreshToken);
    const hasServiceAccount = Boolean(ctx.adapterConfig?.gamServiceAccountJson);
    if (!ctx.adapterConfig || (!hasOAuth && !hasServiceAccount)) {
      reply.code(500).send({ error: "GAM client not configured for this tenant" });
      return false;
    }
    return true;
  }

  function parseQuery(request: FastifyRequest):
    | {
        dateRange: typeof DATE_RANGES[number];
        advertiserId: string | undefined;
        orderId: string | undefined;
        lineItemId: string | undefined;
        timezone: string;
      }
    | { error: string } {
    const q = (request.query ?? {}) as Record<string, string | undefined>;
    const dateRangeRaw = q.date_range;
    if (!dateRangeRaw || !DATE_RANGES.includes(dateRangeRaw as typeof DATE_RANGES[number])) {
      return { error: "Invalid or missing date_range. Must be one of: lifetime, this_month, today" };
    }
    const dateRange = dateRangeRaw as typeof DATE_RANGES[number];
    const advertiserId = q.advertiser_id;
    if (advertiserId && !validateNumericId(advertiserId)) return { error: "Invalid advertiser_id format" };
    const orderId = q.order_id;
    if (orderId && !validateNumericId(orderId)) return { error: "Invalid order_id format" };
    const lineItemId = q.line_item_id;
    if (lineItemId && !validateNumericId(lineItemId)) return { error: "Invalid line_item_id format" };
    const timezone = q.timezone ?? "America/New_York";
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
    } catch {
      return { error: "Invalid timezone" };
    }
    return { dateRange, advertiserId, orderId, lineItemId, timezone };
  }

  fastify.get("/api/tenant/:id/gam/reporting/countries", { schema: gamReportingCountriesRouteSchema }, async (request, reply) => {
    const { id: tenantId } = request.params as { id: string };
    const ctx = await ensureGamTenant(tenantId, request, reply);
    if (!ctx) return;
    const parsed = parseQuery(request);
    if ("error" in parsed) return reply.code(400).send({ error: parsed.error });
    try {
      if (!ensureGamClient(ctx, reply)) return;
      let data = await getCountryBreakdown({
        tenantId,
        dateRange: parsed.dateRange,
        advertiserId: parsed.advertiserId,
        orderId: parsed.orderId,
        lineItemId: parsed.lineItemId,
        timezone: parsed.timezone,
      });
      try {
        const live = await fetchLiveGamCountryBreakdown({
          tenantId,
          dateRange: parsed.dateRange,
          advertiserId: parsed.advertiserId,
          orderId: parsed.orderId,
          lineItemId: parsed.lineItemId,
        });
        if (live.length > 0) data = live;
      } catch {
        // Fall back to cached DB reporting data.
      }
      return reply.send({ success: true, data });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.code(500).send({ error: `Failed to get country breakdown: ${message}` });
    }
  });

  fastify.get("/api/tenant/:id/gam/reporting/ad-units", { schema: gamReportingAdUnitsRouteSchema }, async (request, reply) => {
    const { id: tenantId } = request.params as { id: string };
    const ctx = await ensureGamTenant(tenantId, request, reply);
    if (!ctx) return;
    const parsed = parseQuery(request);
    if ("error" in parsed) return reply.code(400).send({ error: parsed.error });
    try {
      if (!ensureGamClient(ctx, reply)) return;
      let data = await getAdUnitBreakdown({
        tenantId,
        dateRange: parsed.dateRange,
        advertiserId: parsed.advertiserId,
        orderId: parsed.orderId,
        lineItemId: parsed.lineItemId,
        timezone: parsed.timezone,
      });
      try {
        const live = await fetchLiveGamAdUnitBreakdown({
          tenantId,
          dateRange: parsed.dateRange,
          advertiserId: parsed.advertiserId,
          orderId: parsed.orderId,
          lineItemId: parsed.lineItemId,
        });
        if (live.length > 0) data = live;
      } catch {
        // Fall back to cached DB reporting data.
      }
      return reply.send({ success: true, data });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.code(500).send({ error: `Failed to get ad unit breakdown: ${message}` });
    }
  });

  fastify.get(
    "/api/tenant/:id/gam/reporting/advertiser/:adv_id/summary",
    { schema: gamReportingAdvertiserSummaryRouteSchema },
    async (request, reply) => {
    const { id: tenantId, adv_id: advertiserId } = request.params as { id: string; adv_id: string };
    const ctx = await ensureGamTenant(tenantId, request, reply);
    if (!ctx) return;
    if (!validateNumericId(advertiserId)) return reply.code(400).send({ error: "Invalid advertiser_id format" });
    const q = request.query as { date_range?: string; timezone?: string };
    const dateRange = q.date_range as ReportingDateRange;
    if (!dateRange || !DATE_RANGES.includes(dateRange as typeof DATE_RANGES[number])) {
      return reply.code(400).send({
        error: "Invalid or missing date_range. Must be one of: lifetime, this_month, today",
      });
    }
    const timezone = q.timezone ?? "America/New_York";
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
    } catch {
      return reply.code(400).send({ error: "Invalid timezone" });
    }
    try {
      if (!ensureGamClient(ctx, reply)) return;
      let data = await getAdvertiserSummary({
        tenantId,
        advertiserId,
        dateRange,
        timezone,
      });
      try {
        const live = await fetchLiveGamAdvertiserSummary({
          tenantId,
          advertiserId,
          dateRange,
        });
        data = live;
      } catch {
        // Fall back to cached DB reporting data.
      }
      return reply.send({ success: true, data });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.code(500).send({ error: `Failed to get advertiser summary: ${message}` });
    }
    },
  );
};

export default breakdownRoute;
