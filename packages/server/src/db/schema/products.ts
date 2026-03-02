/**
 * Drizzle schema for the `products` table.
 * 1:1 parity with the legacy SQLAlchemy Product model:
 *   _legacy/src/core/database/models.py → class Product(Base)
 *
 * Composite PK: (tenant_id, product_id)
 * inventory_profile_id FK resolves to inventory_profiles.id (DB-013).
 */
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants.js";

// ─── Shape helpers ───────────────────────────────────────────────────────── //
interface FormatId {
  agent_url: string;
  id: string;
}

export const products = pgTable(
  "products",
  {
    tenantId: varchar("tenant_id", { length: 50 })
      .notNull()
      .references(() => tenants.tenantId, { onDelete: "cascade" }),
    productId: varchar("product_id", { length: 100 }).notNull(),

    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),

    // List of { agent_url, id } dicts; validated by DB CHECK constraint
    formatIds: jsonb("format_ids").notNull().$type<FormatId[]>(),

    targetingTemplate: jsonb("targeting_template")
      .notNull()
      .$type<Record<string, unknown>>(),

    deliveryType: varchar("delivery_type", { length: 50 }).notNull(),

    measurement: jsonb("measurement").$type<Record<string, unknown>>(),
    creativePolicy: jsonb("creative_policy").$type<Record<string, unknown>>(),
    priceGuidance: jsonb("price_guidance").$type<Record<string, unknown>>(),

    isCustom: boolean("is_custom").notNull().default(false),
    expiresAt: timestamp("expires_at", { withTimezone: true }),

    countries: jsonb("countries").$type<string[]>(),
    channels: jsonb("channels").$type<string[]>(),

    implementationConfig: jsonb("implementation_config").$type<Record<string, unknown>>(),

    // AdCP property authorization (XOR: exactly one of the three must be set)
    properties: jsonb("properties").$type<Record<string, unknown>[]>(),
    propertyIds: jsonb("property_ids").$type<string[]>(),
    propertyTags: jsonb("property_tags").$type<string[]>(),

    // FK to inventory_profiles.id (DB-013); nullable
    inventoryProfileId: integer("inventory_profile_id"),

    // AdCP v1 product detail fields
    deliveryMeasurement: jsonb("delivery_measurement").$type<Record<string, unknown>>(),
    productCard: jsonb("product_card").$type<Record<string, unknown>>(),
    productCardDetailed: jsonb("product_card_detailed").$type<Record<string, unknown>>(),
    placements: jsonb("placements").$type<Record<string, unknown>[]>(),
    reportingCapabilities: jsonb("reporting_capabilities").$type<Record<string, unknown>>(),

    // Dynamic product fields
    isDynamic: boolean("is_dynamic").notNull().default(false),
    isDynamicVariant: boolean("is_dynamic_variant").notNull().default(false),
    parentProductId: varchar("parent_product_id", { length: 100 }),
    signalsAgentIds: jsonb("signals_agent_ids").$type<string[]>(),
    variantNameTemplate: varchar("variant_name_template", { length: 500 }),
    variantDescriptionTemplate: text("variant_description_template"),
    maxSignals: integer("max_signals").notNull().default(5),
    activationKey: jsonb("activation_key").$type<Record<string, unknown>>(),
    signalMetadata: jsonb("signal_metadata").$type<Record<string, unknown>>(),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    // Soft-delete timestamp for dynamic variants
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    // Days until variant expires; null → use tenant default
    variantTtlDays: integer("variant_ttl_days"),
    // Principal access control: null/empty → visible to all
    allowedPrincipalIds: jsonb("allowed_principal_ids").$type<string[]>(),
  },
  (t) => [primaryKey({ columns: [t.tenantId, t.productId] })],
);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
