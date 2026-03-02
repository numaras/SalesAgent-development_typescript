import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { adapterConfigs } from "../../../db/schema/adapterConfigs.js";
import { tenants } from "../../../db/schema/tenants.js";
import { adapterConfigRouteSchema } from "../../../routes/schemas/admin/adapters/adapterConfig.schema.js";
import { requireTenantAccess } from "../../services/authGuard.js";

type AdapterConfigBody = {
  adapter_type?: string;
  config?: Record<string, unknown>;
};

const KNOWN_ADAPTER_TYPES = new Set([
  "mock",
  "google_ad_manager",
  "gam",
  "broadstreet",
  "kevel",
  "triton",
  "triton_digital",
  "creative_engine",
]);

const adapterConfigRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post("/api/tenant/:id/adapter-config", { schema: adapterConfigRouteSchema }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    request.auditOperation = "update_adapter_config";

    const body = (request.body ?? {}) as AdapterConfigBody;
    const adapterType = typeof body.adapter_type === "string" ? body.adapter_type.trim() : "";
    const configData = body.config && typeof body.config === "object" ? body.config : {};

    if (!adapterType) {
      return reply.code(400).send({ success: false, error: "adapter_type is required" });
    }

    if (!KNOWN_ADAPTER_TYPES.has(adapterType)) {
      return reply.code(400).send({ success: false, error: `Validation error: Unknown adapter type: ${adapterType}` });
    }

    const [tenant] = await db
      .select({ tenantId: tenants.tenantId })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);
    if (!tenant) return reply.code(404).send({ success: false, error: "Tenant not found" });

    const existing = await db
      .select({ tenantId: adapterConfigs.tenantId })
      .from(adapterConfigs)
      .where(eq(adapterConfigs.tenantId, id))
      .limit(1);

    const configValue = configData as Record<string, unknown>;

    if (existing.length) {
      await db
        .update(adapterConfigs)
        .set({
          adapterType,
          configJson: configValue,
          updatedAt: new Date(),
          ...(adapterType === "mock"
            ? {
                mockDryRun: Boolean(configValue.dry_run),
                mockManualApprovalRequired: Boolean(configValue.manual_approval_required),
              }
            : {}),
        })
        .where(eq(adapterConfigs.tenantId, id));
    } else {
      await db.insert(adapterConfigs).values({
        tenantId: id,
        adapterType,
        configJson: configValue,
        mockDryRun: adapterType === "mock" ? Boolean(configValue.dry_run) : null,
        mockManualApprovalRequired: adapterType === "mock" ? Boolean(configValue.manual_approval_required) : false,
      });
    }

    return reply.send({ success: true, adapter_type: adapterType });
  });
};

export default adapterConfigRoute;
