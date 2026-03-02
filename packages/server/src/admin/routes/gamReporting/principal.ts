/**
 * GAM reporting per-principal. Parity with _legacy gam_reporting_api:
 * GET /api/tenant/:id/principals/:p_id/gam/reporting, GET .../principals/:p_id/gam/reporting/summary
 * GAM reporting service not migrated; returns stub response after validating GAM config.
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
import { requireTenantAccess } from "../../services/authGuard.js";

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

    const dateRange = (request.query as { date_range?: string }).date_range;
    if (!dateRange || !DATE_RANGES.includes(dateRange as typeof DATE_RANGES[number])) {
      return reply.code(400).send({
        error: "Invalid or missing date_range. Must be one of: lifetime, this_month, today",
      });
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

      const networkTimezone = adapterConfig.gamNetworkTimezone ?? "America/New_York";

      const now = new Date();
      const start = new Date(now);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);

      // GAM reporting service not yet migrated to TypeScript.
      return reply.send({
        success: true,
        principal_id: principalId,
        advertiser_id: advertiserId,
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

    const dateRange = (request.query as { date_range?: string }).date_range;
    if (!dateRange || !DATE_RANGES.includes(dateRange as typeof DATE_RANGES[number])) {
      return reply.code(400).send({
        error: "Invalid or missing date_range. Must be one of: lifetime, this_month, today",
      });
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

      // GAM reporting service not yet migrated to TypeScript.
      return reply.send({
        success: true,
        data: {
          principal_id: principalId,
          advertiser_id: advertiserId,
          total_impressions: 0,
          total_spend: 0,
          avg_cpm: 0,
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
