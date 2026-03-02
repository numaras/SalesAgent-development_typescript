/**
 * GET/POST /adapters/gam/config/:tenant/:product — get/update GAM product config.
 * Parity with _legacy GoogleAdManager.register_ui_routes (gam_config_ui) and validate_product_config.
 */
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { products } from "../../../db/schema/products.js";
import {
  getGamConfigRouteSchema,
  updateGamConfigRouteSchema,
} from "../../../routes/schemas/admin/adapters/gamConfig.schema.js";
import { getAdminSession } from "../../services/sessionService.js";

function validateGamProductConfig(config: Record<string, unknown>): { ok: boolean; error?: string } {
  const required = ["network_code", "advertiser_id"];
  for (const field of required) {
    if (!config[field]) return { ok: false, error: `Missing required field: ${field}` };
  }
  return { ok: true };
}

const gamConfigRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/adapters/gam/config/:tenant/:product", { schema: getGamConfigRouteSchema }, async (request, reply) => {
    const { tenant, product } = request.params as { tenant: string; product: string };
    const session = getAdminSession(request);
    if (!session.user) return reply.code(401).send({ error: "UNAUTHENTICATED" });
    if (session.role !== "super_admin" && session.tenant_id !== tenant) {
      return reply.code(403).send({ error: "Forbidden: tenant access denied" });
    }

    const [row] = await db
      .select({
        productId: products.productId,
        tenantId: products.tenantId,
        name: products.name,
        implementationConfig: products.implementationConfig,
      })
      .from(products)
      .where(and(eq(products.tenantId, tenant), eq(products.productId, product)))
      .limit(1);
    if (!row) return reply.code(404).send({ error: "Product not found" });

    const config = (row.implementationConfig ?? {}) as Record<string, unknown>;
    return reply.send({
      tenant_id: tenant,
      product_id: product,
      product_name: row.name,
      config,
    });
  });

  fastify.post("/adapters/gam/config/:tenant/:product", { schema: updateGamConfigRouteSchema }, async (request, reply) => {
    const { tenant, product } = request.params as { tenant: string; product: string };
    const session = getAdminSession(request);
    if (!session.user) return reply.code(401).send({ error: "UNAUTHENTICATED" });
    if (session.role !== "super_admin" && session.tenant_id !== tenant) {
      return reply.code(403).send({ error: "Forbidden: tenant access denied" });
    }

    const [row] = await db
      .select({ productId: products.productId, implementationConfig: products.implementationConfig })
      .from(products)
      .where(and(eq(products.tenantId, tenant), eq(products.productId, product)))
      .limit(1);
    if (!row) return reply.code(404).send({ error: "Product not found" });

    const body = (request.body ?? {}) as Record<string, unknown>;
    const existing = (row.implementationConfig ?? {}) as Record<string, unknown>;
    const newConfig = { ...existing, ...body };

    const validation = validateGamProductConfig(newConfig);
    if (!validation.ok) return reply.code(400).send({ error: validation.error });

    await db
      .update(products)
      .set({ implementationConfig: newConfig })
      .where(and(eq(products.tenantId, tenant), eq(products.productId, product)));

    return reply.send({ success: true, config: newConfig });
  });
};

export default gamConfigRoute;
