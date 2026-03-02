/**
 * GET/POST /adapters/mock/connection_config/:tenant — get/update mock adapter connection config (tenant-level).
 * Parity with _legacy AdapterConfig for adapter_type "mock" and MockConnectionConfig (dry_run, manual_approval_required).
 */
import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { adapterConfigs } from "../../../db/schema/adapterConfigs.js";
import {
  getMockConnectionConfigRouteSchema,
  updateMockConnectionConfigRouteSchema,
} from "../../../routes/schemas/admin/adapters/mockConnectionConfig.schema.js";
import { getAdminSession } from "../../services/sessionService.js";

const mockConnectionConfigRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/adapters/mock/connection_config/:tenant", { schema: getMockConnectionConfigRouteSchema }, async (request, reply) => {
    const { tenant } = request.params as { tenant: string };
    const session = getAdminSession(request);
    if (!session.user) return reply.code(401).send({ error: "UNAUTHENTICATED" });
    if (session.role !== "super_admin" && session.tenant_id !== tenant) {
      return reply.code(403).send({ error: "Forbidden: tenant access denied" });
    }

    const [row] = await db
      .select({
        tenantId: adapterConfigs.tenantId,
        adapterType: adapterConfigs.adapterType,
        mockDryRun: adapterConfigs.mockDryRun,
        mockManualApprovalRequired: adapterConfigs.mockManualApprovalRequired,
        configJson: adapterConfigs.configJson,
      })
      .from(adapterConfigs)
      .where(eq(adapterConfigs.tenantId, tenant))
      .limit(1);

    const config = row && row.adapterType === "mock"
      ? {
          tenant_id: tenant,
          adapter_type: "mock" as const,
          dry_run: row.mockDryRun ?? false,
          manual_approval_required: row.mockManualApprovalRequired,
          ...(row.configJson as Record<string, unknown>),
        }
      : {
          tenant_id: tenant,
          adapter_type: "mock" as const,
          dry_run: false,
          manual_approval_required: false,
        };

    return reply.send(config);
  });

  fastify.post("/adapters/mock/connection_config/:tenant", { schema: updateMockConnectionConfigRouteSchema }, async (request, reply) => {
    const { tenant } = request.params as { tenant: string };
    const session = getAdminSession(request);
    if (!session.user) return reply.code(401).send({ error: "UNAUTHENTICATED" });
    if (session.role !== "super_admin" && session.tenant_id !== tenant) {
      return reply.code(403).send({ error: "Forbidden: tenant access denied" });
    }

    const body = (request.body ?? {}) as Record<string, unknown>;
    const dryRun = typeof body.dry_run === "boolean" ? body.dry_run : Boolean(body.dry_run);
    const manualApprovalRequired =
      typeof body.manual_approval_required === "boolean"
        ? body.manual_approval_required
        : Boolean(body.manual_approval_required);

    const [existing] = await db
      .select({ tenantId: adapterConfigs.tenantId })
      .from(adapterConfigs)
      .where(eq(adapterConfigs.tenantId, tenant))
      .limit(1);

    const configJson: Record<string, unknown> = {
      dry_run: dryRun,
      manual_approval_required: manualApprovalRequired,
    };

    if (existing) {
      await db
        .update(adapterConfigs)
        .set({
          adapterType: "mock",
          mockDryRun: dryRun,
          mockManualApprovalRequired: manualApprovalRequired,
          configJson,
          updatedAt: new Date(),
        })
        .where(eq(adapterConfigs.tenantId, tenant));
    } else {
      await db.insert(adapterConfigs).values({
        tenantId: tenant,
        adapterType: "mock",
        mockDryRun: dryRun,
        mockManualApprovalRequired: manualApprovalRequired,
        configJson,
      });
    }

    return reply.send({
      success: true,
      adapter_type: "mock",
      config: { tenant_id: tenant, dry_run: dryRun, manual_approval_required: manualApprovalRequired },
    });
  });
};

export default mockConnectionConfigRoute;
