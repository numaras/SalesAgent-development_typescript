/**
 * GAM reporting per-principal. Parity with _legacy gam_reporting_api:
 * GET /api/tenant/:id/principals/:p_id/gam/reporting, GET .../principals/:p_id/gam/reporting/summary
 * Uses cached synced GAM DB tables (orders + line items) to build reporting responses.
 */
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { adapterConfigs } from "../../../db/schema/adapterConfigs.js";
import { principals } from "../../../db/schema/principals.js";
import {
  principalGamReportingRouteSchema,
  principalGamReportingSummaryRouteSchema,
} from "../../../routes/schemas/admin/gamReporting/principal.schema.js";
import {
  getAdvertiserSummary,
  getBaseReportingRows,
} from "../../services/gamReportingService.js";
import { requireTenantAccess } from "../../services/authGuard.js";
import { fetchLiveGamBaseReportingRows } from "../../../services/gamLiveReportingService.js";

const DATE_RANGES = ["lifetime", "this_month", "today"] as const;
const NUMERIC_ID = /^\d+$/;

function validateTenantId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id) && id.length <= 100;
}
function validatePrincipalId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id) && id.length <= 100;
}
function validateNumericId(id: string): boolean {
  return NUMERIC_ID.test(id) && id.length <= 20;
}

function getAdvertiserId(platformMappings: Record<string, unknown> | null): string | null {
  if (!platformMappings) return null;
  const gam = platformMappings["google_ad_manager"] as Record<string, unknown> | undefined;
  if (gam && typeof gam.advertiser_id === "string") return gam.advertiser_id;
  const adv = platformMappings["gam_advertiser_id"];
  if (typeof adv === "string") return adv;
  return null;
}

const principalRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get(
    "/api/tenant/:id/principals/:p_id/gam/reporting",
    { schema: principalGamReportingRouteSchema },
    async (request, reply) => {
    const { id: tenantId, p_id: principalId } = request.params as { id: string; p_id: string };

    if (!validateTenantId(tenantId)) return reply.code(400).send({ error: "Invalid tenant ID format" });
    if (!validatePrincipalId(principalId)) return reply.code(400).send({ error: "Invalid principal ID format" });
    if (!(await requireTenantAccess(request, reply, tenantId))) return;

    const [principal] = await db
      .select()
      .from(principals)
      .where(and(eq(principals.tenantId, tenantId), eq(principals.principalId, principalId)))
      .limit(1);
    if (!principal) return reply.code(404).send({ error: "Principal not found" });

    const mappings = principal.platformMappings as Record<string, unknown> | null;
    const advertiserId = getAdvertiserId(mappings);
    if (!advertiserId) {
      return reply.code(400).send({ error: "Principal does not have a GAM advertiser ID configured" });
    }

    const dateRangeRaw = (request.query as { date_range?: string }).date_range;
    if (!dateRangeRaw || !DATE_RANGES.includes(dateRangeRaw as typeof DATE_RANGES[number])) {
      return reply.code(400).send({
        error: "Invalid or missing date_range. Must be one of: lifetime, this_month, today",
      });
    }
    const dateRange = dateRangeRaw as typeof DATE_RANGES[number];
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

      const networkTimezone = adapterConfig.gamNetworkTimezone ?? "America/New_York";

      let rows = await getBaseReportingRows({
        tenantId,
        advertiserId,
        orderId,
        lineItemId,
        dateRange,
        timezone,
      });
      let queryType = "db_cached_gam_line_items";
      try {
        const liveRows = await fetchLiveGamBaseReportingRows({
          tenantId,
          advertiserId,
          orderId,
          lineItemId,
          dateRange,
        });
        if (liveRows.length > 0) {
          rows = liveRows;
          queryType = "live_gam_report";
        }
      } catch {
        // Fall back to cached DB reporting data.
      }

      const now = new Date();
      const rangeStart =
        dateRange === "today"
          ? (() => {
              const d = new Date(now);
              d.setHours(0, 0, 0, 0);
              return d;
            })()
          : dateRange === "this_month"
            ? (() => {
                const d = new Date(now);
                d.setDate(1);
                d.setHours(0, 0, 0, 0);
                return d;
              })()
            : new Date(0);

      return reply.send({
        success: true,
        principal_id: principalId,
        advertiser_id: advertiserId,
        data: rows,
        metadata: {
          start_date: rangeStart.toISOString(),
          end_date: now.toISOString(),
          requested_timezone: timezone,
          data_timezone: networkTimezone,
          data_valid_until: now.toISOString(),
          query_type: queryType,
          dimensions: ["advertiser_id", "order_id", "line_item_id", "timestamp"],
          metrics: ["impressions", "clicks", "spend"],
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.code(500).send({ error: `Failed to get reporting data: ${message}` });
    }
    },
  );

  fastify.get(
    "/api/tenant/:id/principals/:p_id/gam/reporting/summary",
    { schema: principalGamReportingSummaryRouteSchema },
    async (request, reply) => {
    const { id: tenantId, p_id: principalId } = request.params as { id: string; p_id: string };

    if (!validateTenantId(tenantId)) return reply.code(400).send({ error: "Invalid tenant ID format" });
    if (!validatePrincipalId(principalId)) return reply.code(400).send({ error: "Invalid principal ID format" });
    if (!(await requireTenantAccess(request, reply, tenantId))) return;

    const [principal] = await db
      .select()
      .from(principals)
      .where(and(eq(principals.tenantId, tenantId), eq(principals.principalId, principalId)))
      .limit(1);
    if (!principal) return reply.code(404).send({ error: "Principal not found" });

    const mappings = principal.platformMappings as Record<string, unknown> | null;
    const advertiserId = getAdvertiserId(mappings);
    if (!advertiserId) {
      return reply.code(400).send({ error: "Principal does not have a GAM advertiser ID configured" });
    }

    const dateRangeRaw = (request.query as { date_range?: string }).date_range;
    if (!dateRangeRaw || !DATE_RANGES.includes(dateRangeRaw as typeof DATE_RANGES[number])) {
      return reply.code(400).send({
        error: "Invalid or missing date_range. Must be one of: lifetime, this_month, today",
      });
    }
    const dateRange = dateRangeRaw as typeof DATE_RANGES[number];
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

      let summary = await getAdvertiserSummary({
        tenantId,
        advertiserId,
        dateRange,
        timezone,
      });
      try {
        const liveRows = await fetchLiveGamBaseReportingRows({
          tenantId,
          advertiserId,
          dateRange,
        });
        if (liveRows.length > 0) {
          const totalImpressions = liveRows.reduce((sum, row) => sum + row.impressions, 0);
          const totalSpend = liveRows.reduce((sum, row) => sum + row.spend, 0);
          summary = {
            advertiser_id: advertiserId,
            total_impressions: totalImpressions,
            total_spend: Number(totalSpend.toFixed(6)),
            avg_cpm:
              totalImpressions > 0
                ? Number((((totalSpend / totalImpressions) * 1000)).toFixed(6))
                : 0,
          };
        }
      } catch {
        // Fall back to cached DB reporting data.
      }

      return reply.send({
        success: true,
        data: {
          principal_id: principalId,
          advertiser_id: summary.advertiser_id,
          total_impressions: summary.total_impressions,
          total_spend: summary.total_spend,
          avg_cpm: summary.avg_cpm,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.code(500).send({ error: `Failed to get advertiser summary: ${message}` });
    }
    },
  );
};

export default principalRoute;
