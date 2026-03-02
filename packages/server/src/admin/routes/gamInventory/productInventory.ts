/**
 * GAM product-inventory assignments. Parity with _legacy products.py:
 * GET/POST /api/tenant/:id/product/:p_id/inventory, GET .../suggest
 */
import { and, eq, inArray } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { auditLogs } from "../../../db/schema/auditLogs.js";
import { gamInventory } from "../../../db/schema/gamInventory.js";
import { productInventoryMappings } from "../../../db/schema/productInventoryMappings.js";
import { products } from "../../../db/schema/products.js";
import { tenants } from "../../../db/schema/tenants.js";
import {
  assignProductInventoryRouteSchema,
  getProductInventoryRouteSchema,
  suggestProductInventoryRouteSchema,
} from "../../../routes/schemas/admin/gamInventory/productInventory.schema.js";
import { requireTenantAccess } from "../../services/authGuard.js";
import { getAdminSession } from "../../services/sessionService.js";

const productInventoryRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/api/tenant/:id/product/:p_id/inventory", { schema: getProductInventoryRouteSchema }, async (request, reply) => {
    const { id: tenantId, p_id: productId } = request.params as { id: string; p_id: string };
    if (!(await requireTenantAccess(request, reply, tenantId))) return;

    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.tenantId, tenantId), eq(products.productId, productId)))
      .limit(1);
    if (!product) return reply.code(404).send({ error: "Product not found" });

    const mappings = await db
      .select()
      .from(productInventoryMappings)
      .where(and(eq(productInventoryMappings.tenantId, tenantId), eq(productInventoryMappings.productId, productId)));

    const inventory: Array<{
      mapping_id: number;
      inventory_id: string;
      inventory_name: string;
      inventory_type: string;
      is_primary: boolean;
      status: string;
      path: string[] | null;
    }> = [];
    for (const m of mappings) {
      const [inv] = await db
        .select()
        .from(gamInventory)
        .where(
          and(
            eq(gamInventory.tenantId, tenantId),
            eq(gamInventory.inventoryId, m.inventoryId),
            eq(gamInventory.inventoryType, m.inventoryType)
          )
        )
        .limit(1);
      if (inv) {
        inventory.push({
          mapping_id: m.id,
          inventory_id: inv.inventoryId,
          inventory_name: inv.name,
          inventory_type: m.inventoryType,
          is_primary: m.isPrimary,
          status: inv.status,
          path: inv.path,
        });
      }
    }

    return reply.send({ inventory, count: inventory.length });
  });

  fastify.post("/api/tenant/:id/product/:p_id/inventory", { schema: assignProductInventoryRouteSchema }, async (request, reply) => {
    const { id: tenantId, p_id: productId } = request.params as { id: string; p_id: string };
    if (!(await requireTenantAccess(request, reply, tenantId))) return;

    const body = (request.body ?? {}) as Record<string, unknown>;
    const inventoryId = typeof body.inventory_id === "string" ? body.inventory_id.trim() : "";
    const inventoryType = typeof body.inventory_type === "string" ? body.inventory_type.trim() : "";
    const isPrimary = body.is_primary === true;

    if (!inventoryId || !inventoryType) {
      return reply.code(400).send({ error: "inventory_id and inventory_type are required" });
    }

    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.tenantId, tenantId), eq(products.productId, productId)))
      .limit(1);
    if (!product) return reply.code(404).send({ error: "Product not found" });

    const [inv] = await db
      .select()
      .from(gamInventory)
      .where(
        and(
          eq(gamInventory.tenantId, tenantId),
          eq(gamInventory.inventoryId, inventoryId),
          eq(gamInventory.inventoryType, inventoryType)
        )
      )
      .limit(1);
    if (!inv) return reply.code(404).send({ error: "Inventory item not found" });

    const [existing] = await db
      .select()
      .from(productInventoryMappings)
      .where(
        and(
          eq(productInventoryMappings.tenantId, tenantId),
          eq(productInventoryMappings.productId, productId),
          eq(productInventoryMappings.inventoryId, inventoryId),
          eq(productInventoryMappings.inventoryType, inventoryType)
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(productInventoryMappings)
        .set({ isPrimary })
        .where(eq(productInventoryMappings.id, existing.id));
      return reply.send({
        message: "Inventory assignment updated",
        mapping_id: existing.id,
        inventory_name: inv.name,
      });
    }

    const [inserted] = await db
      .insert(productInventoryMappings)
      .values({
        tenantId,
        productId,
        inventoryId,
        inventoryType,
        isPrimary,
      })
      .returning({ id: productInventoryMappings.id });

    const impl = (product.implementationConfig as Record<string, unknown>) ?? {};
    const adUnitIds: string[] = [];
    const placementIds: string[] = [];
    const allMappings = await db
      .select()
      .from(productInventoryMappings)
      .where(and(eq(productInventoryMappings.tenantId, tenantId), eq(productInventoryMappings.productId, productId)));
    for (const m of allMappings) {
      const [i] = await db
        .select()
        .from(gamInventory)
        .where(
          and(
            eq(gamInventory.tenantId, tenantId),
            eq(gamInventory.inventoryId, m.inventoryId),
            eq(gamInventory.inventoryType, m.inventoryType)
          )
        )
        .limit(1);
      if (i) {
        if (i.inventoryType === "ad_unit") adUnitIds.push(i.inventoryId);
        else if (i.inventoryType === "placement") placementIds.push(i.inventoryId);
      }
    }
    if (adUnitIds.length > 0) impl.targeted_ad_unit_ids = adUnitIds;
    if (placementIds.length > 0) impl.targeted_placement_ids = placementIds;
    await db
      .update(products)
      .set({ implementationConfig: impl })
      .where(and(eq(products.tenantId, tenantId), eq(products.productId, productId)));

    const actor = getAdminSession(request).user;
    const actorStr = typeof actor === "string" ? actor : "unknown";
    try {
      await db.insert(auditLogs).values({
        tenantId,
        operation: "assign_inventory_to_product",
        principalName: actorStr,
        adapterId: "admin_ui",
        success: true,
        details: {
          event_type: "assign_inventory_to_product",
          product_id: productId,
          inventory_id: inventoryId,
          inventory_type: inventoryType,
          mapping_id: inserted?.id,
        },
      });
    } catch { /* audit failure must not block response */ }

    return reply.code(201).send({
      message: "Inventory assigned to product successfully",
      mapping_id: inserted?.id,
      inventory_name: inv.name,
    });
  });

  fastify.get("/api/tenant/:id/product/:p_id/inventory/suggest", { schema: suggestProductInventoryRouteSchema }, async (request, reply) => {
    const { id: tenantId, p_id: productId } = request.params as { id: string; p_id: string };
    if (!(await requireTenantAccess(request, reply, tenantId))) return;
    const q = String((request.query as { q?: string }).q ?? "").trim();

    const [tenant] = await db.select().from(tenants).where(eq(tenants.tenantId, tenantId)).limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.tenantId, tenantId), eq(products.productId, productId)))
      .limit(1);
    if (!product) return reply.code(404).send({ error: "Product not found" });

    let items = await db
      .select()
      .from(gamInventory)
      .where(
        and(
          eq(gamInventory.tenantId, tenantId),
          inArray(gamInventory.inventoryType, ["ad_unit", "placement"]),
          eq(gamInventory.status, "ACTIVE")
        )
      )
      .limit(100);

    if (q) {
      const lower = q.toLowerCase();
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(lower) ||
          (i.path && JSON.stringify(i.path).toLowerCase().includes(lower))
      );
    }

    const suggestions = items.map((i) => ({
      id: i.inventoryId,
      name: i.name,
      type: i.inventoryType,
      path: i.path ?? [i.name],
      status: i.status,
    }));

    return reply.send({ suggestions, count: suggestions.length });
  });
};

export default productInventoryRoute;
