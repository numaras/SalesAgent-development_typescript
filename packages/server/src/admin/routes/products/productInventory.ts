import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { auditLogs } from "../../../db/schema/auditLogs.js";
import { gamInventory } from "../../../db/schema/gamInventory.js";
import { productInventoryMappings } from "../../../db/schema/productInventoryMappings.js";
import { products } from "../../../db/schema/products.js";
import { requireTenantAccess } from "../../services/authGuard.js";
import { getAdminSession } from "../../services/sessionService.js";

const productInventoryRoute: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  fastify.post("/tenant/:id/products/:productId/inventory", async (request, reply) => {
    const { id, productId } = request.params as { id: string; productId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const body = (request.body ?? {}) as Record<string, unknown>;
    const inventoryId = typeof body.inventory_id === "string" ? body.inventory_id.trim() : "";
    const inventoryType =
      body.inventory_type === "ad_unit" || body.inventory_type === "placement"
        ? (body.inventory_type as "ad_unit" | "placement")
        : null;
    if (!inventoryId || !inventoryType) {
      return reply.code(400).send({ error: "inventory_id and inventory_type are required" });
    }
    const isPrimary = body.is_primary === true;

    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.tenantId, id), eq(products.productId, productId)))
      .limit(1);
    if (!product) return reply.code(404).send({ error: "Product not found" });

    const [inventory] = await db
      .select()
      .from(gamInventory)
      .where(
        and(
          eq(gamInventory.tenantId, id),
          eq(gamInventory.inventoryId, inventoryId),
          eq(gamInventory.inventoryType, inventoryType),
        ),
      )
      .limit(1);
    if (!inventory) return reply.code(404).send({ error: "Inventory item not found" });

    // Check for existing mapping (upsert logic matching Python L2310-2319)
    const [existing] = await db
      .select()
      .from(productInventoryMappings)
      .where(
        and(
          eq(productInventoryMappings.tenantId, id),
          eq(productInventoryMappings.productId, productId),
          eq(productInventoryMappings.inventoryType, inventoryType),
          eq(productInventoryMappings.inventoryId, inventoryId),
        ),
      )
      .limit(1);

    let mappingId: number;
    if (existing) {
      await db
        .update(productInventoryMappings)
        .set({ isPrimary })
        .where(eq(productInventoryMappings.id, existing.id));
      mappingId = existing.id;
    } else {
      const [inserted] = await db
        .insert(productInventoryMappings)
        .values({ tenantId: id, productId, inventoryType, inventoryId, isPrimary })
        .returning({ id: productInventoryMappings.id });
      mappingId = inserted!.id;
    }

    const actor = getAdminSession(request).user;
    const actorStr = typeof actor === "string" ? actor : "unknown";
    try {
      await db.insert(auditLogs).values({
        tenantId: id,
        operation: "assign_inventory_to_product",
        principalName: actorStr,
        adapterId: "admin_ui",
        success: true,
        details: { event_type: "assign_inventory_to_product", product_id: productId, inventory_id: inventoryId, inventory_type: inventoryType, mapping_id: mappingId },
      });
    } catch { /* audit failure must not block response */ }

    return reply.code(existing ? 200 : 201).send({
      message: "Inventory assigned to product successfully",
      mapping_id: mappingId,
      inventory_name: inventory.name,
    });
  });

  fastify.get("/tenant/:id/products/:productId/inventory", async (request, reply) => {
    const { id, productId } = request.params as { id: string; productId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.tenantId, id), eq(products.productId, productId)))
      .limit(1);
    if (!product) return reply.code(404).send({ error: "Product not found" });

    const mappings = await db
      .select()
      .from(productInventoryMappings)
      .where(
        and(
          eq(productInventoryMappings.tenantId, id),
          eq(productInventoryMappings.productId, productId),
        ),
      );

    const allInventory = await db
      .select()
      .from(gamInventory)
      .where(eq(gamInventory.tenantId, id));
    const inventoryByKey = new Map(
      allInventory.map((item) => [`${item.inventoryType}:${item.inventoryId}`, item]),
    );

    const inventory = mappings
      .map((mapping) => {
        const item = inventoryByKey.get(`${mapping.inventoryType}:${mapping.inventoryId}`);
        if (!item) return null;
        return {
          mapping_id: mapping.id,
          inventory_id: item.inventoryId,
          inventory_name: item.name,
          inventory_type: mapping.inventoryType,
          is_primary: mapping.isPrimary,
          status: item.status,
          path: item.path ?? [],
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return reply.send({ inventory, count: inventory.length });
  });

  fastify.delete(
    "/tenant/:id/products/:productId/inventory/:mappingId",
    async (request, reply) => {
      const { id, productId, mappingId: mappingIdStr } = request.params as {
        id: string;
        productId: string;
        mappingId: string;
      };
      if (!(await requireTenantAccess(request, reply, id))) return;

      const mappingId = parseInt(mappingIdStr, 10);
      if (Number.isNaN(mappingId)) {
        return reply.code(404).send({ success: false, message: "Inventory assignment not found" });
      }

      const [product] = await db
        .select()
        .from(products)
        .where(and(eq(products.tenantId, id), eq(products.productId, productId)))
        .limit(1);
      if (!product) {
        return reply.code(404).send({ success: false, message: "Product not found" });
      }

      const [mapping] = await db
        .select()
        .from(productInventoryMappings)
        .where(
          and(
            eq(productInventoryMappings.id, mappingId),
            eq(productInventoryMappings.tenantId, id),
            eq(productInventoryMappings.productId, productId),
          ),
        )
        .limit(1);
      if (!mapping) {
        return reply.code(404).send({ success: false, message: "Inventory assignment not found" });
      }

      await db
        .delete(productInventoryMappings)
        .where(eq(productInventoryMappings.id, mappingId));

      const actor = getAdminSession(request).user;
      const actorStr = typeof actor === "string" ? actor : "unknown";
      try {
        await db.insert(auditLogs).values({
          tenantId: id,
          operation: "unassign_inventory_from_product",
          principalName: actorStr,
          adapterId: "admin_ui",
          success: true,
          details: { event_type: "unassign_inventory_from_product", product_id: productId, mapping_id: mappingId, inventory_id: mapping.inventoryId, inventory_type: mapping.inventoryType },
        });
      } catch { /* audit failure must not block response */ }

      return reply.send({
        success: true,
        message: "Inventory assignment removed successfully",
      });
    },
  );
};

export default productInventoryRoute;
