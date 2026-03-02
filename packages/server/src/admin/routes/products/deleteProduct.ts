import { and, eq, inArray, or } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { auditLogs } from "../../../db/schema/auditLogs.js";
import { mediaBuys } from "../../../db/schema/mediaBuys.js";
import { products } from "../../../db/schema/products.js";
import { requireTenantAccess } from "../../services/authGuard.js";
import { getAdminSession } from "../../services/sessionService.js";

const deleteProductRoute: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  fastify.delete("/tenant/:id/products/:productId/delete", async (request, reply) => {
    const { id, productId } = request.params as { id: string; productId: string };

    if (!(await requireTenantAccess(request, reply, id))) return;

    const session = getAdminSession(request);

    try {
      const [existing] = await db
        .select({ productId: products.productId, name: products.name })
        .from(products)
        .where(and(eq(products.tenantId, id), eq(products.productId, productId)))
        .limit(1);
      if (!existing) {
        return reply.code(404).send({ success: false, error: "Product not found" });
      }

      const productName = existing.name;

      // Check if product is referenced by any active media buys (Python L2185-2220)
      const activeBuys = await db
        .select({ mediaBuyId: mediaBuys.mediaBuyId, rawRequest: mediaBuys.rawRequest })
        .from(mediaBuys)
        .where(
          and(
            eq(mediaBuys.tenantId, id),
            inArray(mediaBuys.status, ["pending", "active", "paused"]),
          ),
        );

      for (const buy of activeBuys) {
        const rawProductIds: string[] = (() => {
          try {
            const rr = buy.rawRequest as Record<string, unknown>;
            const ids = rr?.product_ids;
            return Array.isArray(ids) ? ids.map(String) : [];
          } catch {
            return [];
          }
        })();
        if (rawProductIds.includes(productId)) {
          return reply.code(400).send({
            success: false,
            error: `Cannot delete product '${productName}' - it is used in active media buy '${buy.mediaBuyId}'`,
          });
        }
      }

      await db
        .delete(products)
        .where(and(eq(products.tenantId, id), eq(products.productId, productId)));

      const actor = typeof session.user === "string" ? session.user : "unknown";
      try {
        await db.insert(auditLogs).values({
          tenantId: id,
          operation: "delete_product",
          principalName: actor,
          adapterId: "admin_ui",
          success: true,
          details: { event_type: "delete_product", product_id: productId, product_name: productName },
        });
      } catch { /* audit failure must not block response */ }

      return reply.send({
        success: true,
        product_id: productId,
        message: `Product '${productName}' deleted successfully`,
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);

      // Foreign key violation — product referenced by other records (Python L2244-2246)
      if (message.includes("ForeignKeyViolation") || message.toLowerCase().includes("foreign key constraint")) {
        return reply.code(400).send({
          success: false,
          error: "Cannot delete product - it is referenced by other records",
        });
      }

      // Validation error (Python L2248-2250)
      if (message.includes("ValidationError") || message.toLowerCase().includes("pattern")) {
        return reply.code(400).send({
          success: false,
          error: "Product data validation failed",
        });
      }

      request.log.error(e, `Product deletion failed for ${productId}`);
      return reply.code(500).send({
        success: false,
        error: `Failed to delete product: ${message}`,
      });
    }
  });
};

export default deleteProductRoute;
