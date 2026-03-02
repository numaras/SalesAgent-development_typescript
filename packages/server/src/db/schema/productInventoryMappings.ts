/**
 * Drizzle schema for the `product_inventory_mappings` table.
 * Parity with _legacy ProductInventoryMapping model.
 */
import { boolean, index, pgTable, serial, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants.js";

export const productInventoryMappings = pgTable(
  "product_inventory_mappings",
  {
    id: serial("id").primaryKey(),
    tenantId: varchar("tenant_id", { length: 50 })
      .notNull()
      .references(() => tenants.tenantId, { onDelete: "cascade" }),
    productId: varchar("product_id", { length: 50 }).notNull(),
    inventoryType: varchar("inventory_type", { length: 30 }).notNull(),
    inventoryId: varchar("inventory_id", { length: 50 }).notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("idx_product_inventory_mapping").on(t.tenantId, t.productId),
    uniqueIndex("uq_product_inventory").on(t.tenantId, t.productId, t.inventoryType, t.inventoryId),
  ]
);

// FK (tenant_id, product_id) -> products: ensure in migration or application
export type ProductInventoryMappingRow = typeof productInventoryMappings.$inferSelect;
export type NewProductInventoryMappingRow = typeof productInventoryMappings.$inferInsert;
