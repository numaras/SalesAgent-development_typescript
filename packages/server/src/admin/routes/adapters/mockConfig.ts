import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { products } from "../../../db/schema/products.js";
import {
  getMockConfigRouteSchema,
  updateMockConfigRouteSchema,
} from "../../../routes/schemas/admin/adapters/mockConfig.schema.js";
import { requireTenantAccess } from "../../services/authGuard.js";

function clampNum(value: unknown, defaultVal: number, min?: number, max?: number): number {
  const n = typeof value === "number" && !Number.isNaN(value) ? value : Number(value);
  if (Number.isNaN(n)) return defaultVal;
  if (min != null && n < min) return min;
  if (max != null && n > max) return max;
  return n;
}

const mockConfigRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/tenant/:id/adapters/mock/config/:productId", { schema: getMockConfigRouteSchema }, async (request, reply) => {
    const { id, productId } = request.params as { id: string; productId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const [product] = await db
      .select({
        productId: products.productId,
        tenantId: products.tenantId,
        name: products.name,
        implementationConfig: products.implementationConfig,
      })
      .from(products)
      .where(and(eq(products.tenantId, id), eq(products.productId, productId)))
      .limit(1);
    if (!product) return reply.code(404).send({ error: "Product not found" });

    const config = product.implementationConfig ?? {};
    return reply.send({
      tenant_id: id,
      product_id: productId,
      product_name: product.name,
      config,
    });
  });

  fastify.post("/tenant/:id/adapters/mock/config/:productId", { schema: updateMockConfigRouteSchema }, async (request, reply) => {
    const { id, productId } = request.params as { id: string; productId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const [product] = await db
      .select({ productId: products.productId, implementationConfig: products.implementationConfig })
      .from(products)
      .where(and(eq(products.tenantId, id), eq(products.productId, productId)))
      .limit(1);
    if (!product) return reply.code(404).send({ error: "Product not found" });

    const body = (request.body ?? {}) as Record<string, unknown>;
    const existing = (product.implementationConfig ?? {}) as Record<string, unknown>;

    const dailyImpressions = clampNum(body.daily_impressions ?? existing.daily_impressions, 100000, 0);
    const fillRate = clampNum(body.fill_rate ?? existing.fill_rate, 85, 0, 100);
    const ctr = clampNum(body.ctr ?? existing.ctr, 0.5, 0, 100);
    const viewabilityRate = clampNum(body.viewability_rate ?? existing.viewability_rate, 70, 0, 100);
    const latencyMs = clampNum(body.latency_ms ?? existing.latency_ms, 50, 0, 60000);
    const errorRate = clampNum(body.error_rate ?? existing.error_rate, 0.1, 0, 100);
    const testMode =
      typeof body.test_mode === "string" && ["normal", "high_demand", "degraded", "outage"].includes(body.test_mode)
        ? body.test_mode
        : (existing.test_mode as string) ?? "normal";
    const priceVariance = clampNum(body.price_variance ?? existing.price_variance, 10, 0, 100);
    const seasonalFactor = clampNum(body.seasonal_factor ?? existing.seasonal_factor, 1, 0.1, 10);

    const deliverySimEnabled = body.delivery_simulation_enabled ?? (existing.delivery_simulation as Record<string, unknown>)?.enabled ?? false;
    const timeAcceleration = clampNum(
      (body.delivery_simulation as Record<string, unknown>)?.time_acceleration ??
        (existing.delivery_simulation as Record<string, unknown>)?.time_acceleration,
      3600,
      1,
      86400,
    );
    const updateIntervalSeconds = clampNum(
      (body.delivery_simulation as Record<string, unknown>)?.update_interval_seconds ??
        (existing.delivery_simulation as Record<string, unknown>)?.update_interval_seconds,
      1,
      0.1,
      60,
    );

    const newConfig: Record<string, unknown> = {
      ...existing,
      daily_impressions: dailyImpressions,
      fill_rate: fillRate,
      ctr,
      viewability_rate: viewabilityRate,
      latency_ms: latencyMs,
      error_rate: errorRate,
      test_mode: testMode,
      price_variance: priceVariance,
      seasonal_factor: seasonalFactor,
      delivery_simulation: {
        enabled: Boolean(deliverySimEnabled),
        time_acceleration: timeAcceleration,
        update_interval_seconds: updateIntervalSeconds,
      },
      verbose_logging: Boolean(body.verbose_logging ?? existing.verbose_logging),
      predictable_ids: Boolean(body.predictable_ids ?? existing.predictable_ids),
    };

    await db
      .update(products)
      .set({ implementationConfig: newConfig })
      .where(and(eq(products.tenantId, id), eq(products.productId, productId)));

    return reply.send({
      success: true,
      message: "Mock adapter configuration saved successfully",
      config: newConfig,
    });
  });
};

export default mockConfigRoute;
