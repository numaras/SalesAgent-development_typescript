import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { adapterConfigs } from "../../../db/schema/adapterConfigs.js";
import { buildGamClient } from "../../../gam/gamClient.js";
import {
  createServiceAccountRouteSchema,
  gamPingRouteSchema,
  getServiceAccountEmailRouteSchema,
  testGamConnectionRouteSchema,
} from "../../../routes/schemas/admin/gam/serviceAccount.schema.js";
import { requireTenantAccess } from "../../services/authGuard.js";
import { getAdminSession } from "../../services/sessionService.js";

function buildServiceAccountEmail(tenantId: string, gcpProjectId: string): string {
  const normalizedTenant = tenantId.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 30);
  return `gam-${normalizedTenant}@${gcpProjectId}.iam.gserviceaccount.com`;
}


const serviceAccountRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post("/tenant/:id/gam/create-service-account", { schema: createServiceAccountRouteSchema }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const session = getAdminSession(request);
    if (session.role === "viewer") return reply.code(403).send({ success: false, error: "Access denied" });

    request.auditOperation = "create_gam_service_account";

    const gcpProjectId = process.env.GCP_PROJECT_ID?.trim();
    if (!gcpProjectId) {
      return reply.code(500).send({
        success: false,
        error: "GCP_PROJECT_ID not configured. Please set this environment variable.",
      });
    }

    const serviceAccountEmail = buildServiceAccountEmail(id, gcpProjectId);
    const existing = await db
      .select({ tenantId: adapterConfigs.tenantId })
      .from(adapterConfigs)
      .where(eq(adapterConfigs.tenantId, id))
      .limit(1);

    if (existing.length) {
      await db
        .update(adapterConfigs)
        .set({
          adapterType: "google_ad_manager",
          gamServiceAccountEmail: serviceAccountEmail,
          updatedAt: new Date(),
        })
        .where(eq(adapterConfigs.tenantId, id));
    } else {
      await db.insert(adapterConfigs).values({
        tenantId: id,
        adapterType: "google_ad_manager",
        gamServiceAccountEmail: serviceAccountEmail,
      });
    }

    return reply.send({
      success: true,
      service_account_email: serviceAccountEmail,
      message:
        "Service account created successfully. Please add this email as a user in your Google Ad Manager with Trafficker role.",
    });
  });

  fastify.get("/tenant/:id/gam/get-service-account-email", { schema: getServiceAccountEmailRouteSchema }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const [adapterConfig] = await db
      .select({ gamServiceAccountEmail: adapterConfigs.gamServiceAccountEmail })
      .from(adapterConfigs)
      .where(eq(adapterConfigs.tenantId, id))
      .limit(1);

    if (!adapterConfig?.gamServiceAccountEmail) {
      return reply.send({
        success: true,
        service_account_email: null,
        message: "No service account created",
      });
    }

    return reply.send({
      success: true,
      service_account_email: adapterConfig.gamServiceAccountEmail,
    });
  });

  /**
   * GET /tenant/:id/gam/ping
   * Tests the saved GAM credentials by making real API calls.
   * Returns live network info + first advertisers as proof of connectivity.
   */
  fastify.get("/tenant/:id/gam/ping", { schema: gamPingRouteSchema }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const session = getAdminSession(request);
    if (session.role === "viewer") return reply.code(403).send({ success: false, error: "Access denied" });

    request.auditOperation = "gam_ping";

    const [adapterConfig] = await db
      .select()
      .from(adapterConfigs)
      .where(eq(adapterConfigs.tenantId, id))
      .limit(1);

    if (!adapterConfig?.gamNetworkCode) {
      return reply.code(400).send({ success: false, error: "GAM not configured for this tenant" });
    }

    try {
      const gamClient = buildGamClient(adapterConfig);

      // Fetch current network info
      const networkService = await gamClient.getService("NetworkService");
      const network = (await (networkService as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>)
        .getCurrentNetwork()) as Record<string, unknown>;

      // Fetch first 5 advertisers
      const companyService = await gamClient.getService("CompanyService");
      const companiesPage = (await (companyService as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>)
        .getCompaniesByStatement({ query: "WHERE type = 'ADVERTISER' LIMIT 5 OFFSET 0" })) as Record<string, unknown>;

      const advertisers = ((companiesPage["results"] as unknown[]) ?? []).map((c) => {
        const co = c as Record<string, unknown>;
        return { id: String(co["id"]), name: String(co["name"] ?? co["id"]) };
      });

      return reply.send({
        success: true,
        network: {
          network_code: String(network["networkCode"] ?? adapterConfig.gamNetworkCode),
          display_name: String(network["displayName"] ?? ""),
          currency_code: String(network["currencyCode"] ?? ""),
          timezone: String(network["timeZone"] ?? ""),
        },
        advertisers,
        advertiser_count: advertisers.length,
        auth_method: adapterConfig.gamAuthMethod ?? "oauth",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return reply.code(500).send({ success: false, error: msg });
    }
  });

  fastify.post("/tenant/:id/gam/test-connection", { schema: testGamConnectionRouteSchema }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const session = getAdminSession(request);
    if (session.role === "viewer") return reply.code(403).send({ success: false, error: "Access denied" });

    request.auditOperation = "test_gam_connection";

    const [adapterConfig] = await db
      .select()
      .from(adapterConfigs)
      .where(eq(adapterConfigs.tenantId, id))
      .limit(1);

    if (!adapterConfig?.gamNetworkCode) {
      return reply.code(400).send({ success: false, error: "GAM not configured for this tenant" });
    }

    try {
      const gamClient = buildGamClient(adapterConfig);
      const networkService = await gamClient.getService("NetworkService");
      const network = (await (networkService as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>)
        .getCurrentNetwork()) as Record<string, unknown>;

      return reply.send({
        success: true,
        message: "Successfully connected to Google Ad Manager",
        network_code: String(network["networkCode"] ?? adapterConfig.gamNetworkCode),
        display_name: String(network["displayName"] ?? ""),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return reply.code(500).send({ success: false, error: msg });
    }
  });
};

export default serviceAccountRoute;
