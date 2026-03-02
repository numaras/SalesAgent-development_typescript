import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { auditLogs } from "../../../db/schema/auditLogs.js";
import { principals } from "../../../db/schema/principals.js";
import { tenants } from "../../../db/schema/tenants.js";
import { buildGamDiscoveryClient } from "../../../gam/gamClient.js";
import {
  getGamAdvertisersRouteSchema,
  testGamConnectionByRefreshTokenRouteSchema,
} from "../../../routes/schemas/admin/api/gamAdvertisers.schema.js";
import { getAdminSession } from "../../services/sessionService.js";

function resolveTenantId(
  sessionTenantId: unknown,
  bodyTenantId: unknown,
): string | null {
  if (typeof bodyTenantId === "string" && bodyTenantId.trim()) return bodyTenantId.trim();
  if (typeof sessionTenantId === "string" && sessionTenantId.trim()) return sessionTenantId.trim();
  return null;
}

const gamAdvertisersRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post("/api/gam/get-advertisers", { schema: getGamAdvertisersRouteSchema }, async (request, reply) => {
    const session = getAdminSession(request);
    if (!session.user) return reply.code(401).send({ error: "UNAUTHENTICATED" });

    const body = (request.body ?? {}) as Record<string, unknown>;
    const tenantId = resolveTenantId(session.tenant_id, body.tenant_id);
    if (!tenantId) {
      return reply.code(400).send({ error: "tenant_id is required" });
    }

    const [tenant] = await db
      .select({ tenantId: tenants.tenantId, adServer: tenants.adServer })
      .from(tenants)
      .where(eq(tenants.tenantId, tenantId))
      .limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });
    if (tenant.adServer !== "google_ad_manager") {
      return reply.code(400).send({ error: "Google Ad Manager not configured" });
    }

    const search =
      typeof body.search === "string" ? body.search.trim().toLowerCase() : "";
    const limitInput =
      typeof body.limit === "number"
        ? body.limit
        : typeof body.limit === "string"
          ? Number(body.limit)
          : 500;
    const limit = Number.isFinite(limitInput) ? Math.min(Math.max(limitInput, 1), 500) : 500;

    const rows = await db
      .select({
        principal_id: principals.principalId,
        name: principals.name,
        platform_mappings: principals.platformMappings,
      })
      .from(principals)
      .where(eq(principals.tenantId, tenantId));

    const advertisers = rows
      .map((row) => {
        const mappings =
          row.platform_mappings && typeof row.platform_mappings === "object"
            ? row.platform_mappings
            : {};
        const advertiserId =
          typeof mappings["google_ad_manager"] === "string"
            ? mappings["google_ad_manager"]
            : row.principal_id;
        return {
          id: advertiserId,
          name: row.name,
          principal_id: row.principal_id,
        };
      })
      .filter((item) => {
        if (!search) return true;
        return (
          item.name.toLowerCase().includes(search) ||
          item.id.toLowerCase().includes(search)
        );
      })
      .slice(0, limit);

    const actor = getAdminSession(request).user;
    const actorStr = typeof actor === "string" ? actor : "unknown";
    try {
      await db.insert(auditLogs).values({
        tenantId,
        operation: "gam_get_advertisers",
        principalName: actorStr,
        adapterId: "admin_ui",
        success: true,
        details: { event_type: "gam_get_advertisers", count: advertisers.length },
      });
    } catch { /* audit failure must not block response */ }

    return reply.send({
      success: true,
      advertisers,
      count: advertisers.length,
    });
  });

  fastify.post("/api/gam/test-connection", { schema: testGamConnectionByRefreshTokenRouteSchema }, async (request, reply) => {
    const session = getAdminSession(request);
    if (!session.user) return reply.code(401).send({ error: "UNAUTHENTICATED" });

    const body = (request.body ?? {}) as Record<string, unknown>;
    const refreshToken =
      typeof body.refresh_token === "string" ? body.refresh_token.trim() : "";
    if (!refreshToken) {
      return reply.code(400).send({ error: "Refresh token is required" });
    }

    const clientId = process.env["GAM_OAUTH_CLIENT_ID"] ?? "";
    const clientSecret = process.env["GAM_OAUTH_CLIENT_SECRET"] ?? "";
    if (!clientId || !clientSecret) {
      return reply.code(400).send({
        error:
          "GAM OAuth credentials not configured. Please set GAM_OAUTH_CLIENT_ID and GAM_OAUTH_CLIENT_SECRET environment variables.",
      });
    }

    const actor = getAdminSession(request).user;
    const actorStr = typeof actor === "string" ? actor : "unknown";
    const sessionTenantId =
      typeof getAdminSession(request).tenant_id === "string"
        ? (getAdminSession(request).tenant_id as string)
        : "unknown";

    try {
      const gamClient = buildGamDiscoveryClient(refreshToken);
      const networkService = await gamClient.getService("NetworkService");
      const networks = (await (networkService as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>)
        .getAllNetworks()) as Array<Record<string, unknown>>;

      const networkList = (networks ?? []).map((n) => ({
        id: String(n["networkCode"]),
        display_name: (n["displayName"] as string | undefined) ?? String(n["networkCode"]),
        currency_code: n["currencyCode"] ?? null,
        timezone: n["timeZone"] ?? null,
      }));

      try {
        await db.insert(auditLogs).values({
          tenantId: sessionTenantId,
          operation: "test_gam_connection",
          principalName: actorStr,
          adapterId: "admin_ui",
          success: true,
          details: { event_type: "test_gam_connection", network_count: networkList.length },
        });
      } catch { /* audit failure must not block response */ }

      return reply.send({ success: true, message: "Connection test successful", networks: networkList });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      try {
        await db.insert(auditLogs).values({
          tenantId: sessionTenantId,
          operation: "test_gam_connection",
          principalName: actorStr,
          adapterId: "admin_ui",
          success: false,
          details: { event_type: "test_gam_connection", error: msg },
        });
      } catch { /* audit failure must not block response */ }
      return reply.code(500).send({ success: false, error: `GAM connection test failed: ${msg}` });
    }
  });
};

export default gamAdvertisersRoute;
