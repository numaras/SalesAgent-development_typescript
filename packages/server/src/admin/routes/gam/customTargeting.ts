import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { adapterConfigs } from "../../../db/schema/adapterConfigs.js";
import { tenants } from "../../../db/schema/tenants.js";
import { customTargetingRouteSchema } from "../../../routes/schemas/admin/gam/customTargeting.schema.js";
import { requireTenantAccess } from "../../services/authGuard.js";

const customTargetingRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/tenant/:id/gam/api/custom-targeting-keys", { schema: customTargetingRouteSchema }, async (request, reply) => {
    const { id } = request.params as { id: string };
    // Mirrors Python @require_tenant_access(api_mode=True) gam.py L580
    if (!(await requireTenantAccess(request, reply, id))) return;

    const [tenant] = await db
      .select({ tenantId: tenants.tenantId })
      .from(tenants)
      .where(and(eq(tenants.tenantId, id), eq(tenants.isActive, true)))
      .limit(1);

    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const [adapterConfig] = await db
      .select({
        gamNetworkCode: adapterConfigs.gamNetworkCode,
        gamRefreshToken: adapterConfigs.gamRefreshToken,
        customTargetingKeys: adapterConfigs.customTargetingKeys,
      })
      .from(adapterConfigs)
      .where(eq(adapterConfigs.tenantId, id))
      .limit(1);

    if (!adapterConfig?.gamNetworkCode || !adapterConfig.gamRefreshToken) {
      return reply.code(400).send({
        error: "Please connect your GAM account first. Go to Ad Server settings to configure GAM.",
      });
    }

    const existingKeys = adapterConfig.customTargetingKeys ?? {};
    const keys = Object.entries(existingKeys).map(([name, keyId]) => ({
      id: keyId,
      name,
      displayName: name,
      status: "ACTIVE",
    }));

    return reply.send({
      success: true,
      keys,
    });
  });
};

export default customTargetingRoute;
