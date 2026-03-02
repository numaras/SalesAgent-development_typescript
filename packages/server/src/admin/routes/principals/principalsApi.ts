import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { principals } from "../../../db/schema/principals.js";
import { requireTenantAccess } from "../../services/authGuard.js";

const principalsApiRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/tenant/:id/principal/:principalId", async (request, reply) => {
    const { id, principalId } = request.params as { id: string; principalId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const [principal] = await db
      .select()
      .from(principals)
      .where(and(eq(principals.tenantId, id), eq(principals.principalId, principalId)))
      .limit(1);
    if (!principal) return reply.code(404).send({ error: "Principal not found" });

    const mappings = (principal.platformMappings ?? {}) as Record<string, unknown>;
    return reply.send({
      success: true,
      principal: {
        principal_id: principal.principalId,
        name: principal.name,
        access_token: principal.accessToken,
        platform_mappings: mappings,
        created_at: principal.createdAt?.toISOString() ?? null,
      },
    });
  });

  fastify.post("/tenant/:id/principal/:principalId/update_mappings", async (request, reply) => {
    const { id, principalId } = request.params as { id: string; principalId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;
    request.auditOperation = "update_mappings";

    const body = (request.body ?? {}) as Record<string, unknown>;
    const platformMappings = body.platform_mappings as Record<string, unknown> | undefined;
    if (!platformMappings || typeof platformMappings !== "object") {
      return reply.code(400).send({ error: "Invalid request" });
    }

    const gamConfig = platformMappings.google_ad_manager as Record<string, unknown> | undefined;
    if (gamConfig) {
      const advertiserId = (gamConfig.advertiser_id ?? gamConfig.company_id) as string | undefined;
      if (advertiserId) {
        const n = parseInt(String(advertiserId), 10);
        if (Number.isNaN(n)) {
          return reply.code(400).send({
            error: "GAM Advertiser ID must be numeric. Please select a valid advertiser from the dropdown.",
          });
        }
      }
    }

    const [principal] = await db
      .select()
      .from(principals)
      .where(and(eq(principals.tenantId, id), eq(principals.principalId, principalId)))
      .limit(1);
    if (!principal) return reply.code(404).send({ error: "Principal not found" });

    await db
      .update(principals)
      .set({ platformMappings: platformMappings as Record<string, string>, updatedAt: new Date() })
      .where(and(eq(principals.tenantId, id), eq(principals.principalId, principalId)));

    return reply.send({ success: true, message: "Platform mappings updated successfully" });
  });

  fastify.post("/tenant/:id/api/principal/:principalId/testing-config", async (request, reply) => {
    const { id, principalId } = request.params as { id: string; principalId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const body = (request.body ?? {}) as Record<string, unknown>;
    const hitlConfig = body.hitl_config;
    if (hitlConfig === undefined) return reply.code(400).send({ error: "Missing hitl_config in request" });

    const [principal] = await db
      .select()
      .from(principals)
      .where(and(eq(principals.tenantId, id), eq(principals.principalId, principalId)))
      .limit(1);
    if (!principal) return reply.code(404).send({ error: "Principal not found" });

    const platformMappings = { ...((principal.platformMappings ?? {}) as Record<string, unknown>) };
    if (!platformMappings.mock || typeof platformMappings.mock !== "object") {
      platformMappings.mock = { advertiser_id: `mock_${principalId}`, enabled: true };
    }
    const mockEntry = platformMappings.mock as Record<string, unknown>;
    mockEntry.hitl_config = hitlConfig;

    await db
      .update(principals)
      .set({ platformMappings: platformMappings as Record<string, string>, updatedAt: new Date() })
      .where(and(eq(principals.tenantId, id), eq(principals.principalId, principalId)));

    return reply.send({ success: true, message: "Testing configuration saved successfully" });
  });
};

export default principalsApiRoute;
