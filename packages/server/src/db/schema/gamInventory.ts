/**
 * Drizzle schema for the `gam_inventory` table.
 * 1:1 parity with the legacy SQLAlchemy GAMInventory model:
 *   _legacy/src/core/database/models.py → class GAMInventory(Base)
 *
 * Stores synced Google Ad Manager inventory items (ad units, placements)
 * per tenant. Used by the GAM adapter for targeting resolution.
 */
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants.js";

export const gamInventory = pgTable(
  "gam_inventory",
  {
    id: serial("id").primaryKey(),

    tenantId: varchar("tenant_id", { length: 50 })
      .notNull()
      .references(() => tenants.tenantId, { onDelete: "cascade" }),

    // Values: ad_unit | placement (GAM inventory types)
    inventoryType: varchar("inventory_type", { length: 30 }).notNull(),
    inventoryId: varchar("inventory_id", { length: 50 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),

    // Breadcrumb path from root to this item, e.g. ["Root", "Sports", "Football"]
    path: jsonb("path").$type<string[]>(),

    status: varchar("status", { length: 20 }).notNull(),
    inventoryMetadata: jsonb("inventory_metadata").$type<Record<string, unknown>>(),

    lastSynced: timestamp("last_synced", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("uq_gam_inventory").on(t.tenantId, t.inventoryType, t.inventoryId),
    index("idx_gam_inventory_tenant").on(t.tenantId),
    index("idx_gam_inventory_type").on(t.inventoryType),
    index("idx_gam_inventory_status").on(t.status),
  ],
);

export type GamInventory = typeof gamInventory.$inferSelect;
export type NewGamInventory = typeof gamInventory.$inferInsert;

/**
 * Drizzle schema for the `gam_orders` table.
 * 1:1 parity with the legacy SQLAlchemy GAMOrder model:
 *   _legacy/src/core/database/models.py → class GAMOrder(Base)
 *
 * Stores synced Google Ad Manager orders per tenant.
 */
export const gamOrders = pgTable(
  "gam_orders",
  {
    id: serial("id").primaryKey(),

    tenantId: varchar("tenant_id", { length: 50 })
      .notNull()
      .references(() => tenants.tenantId, { onDelete: "cascade" }),

    orderId: varchar("order_id", { length: 50 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),

    advertiserId: varchar("advertiser_id", { length: 50 }),
    advertiserName: varchar("advertiser_name", { length: 255 }),
    agencyId: varchar("agency_id", { length: 50 }),
    agencyName: varchar("agency_name", { length: 255 }),
    traffickerId: varchar("trafficker_id", { length: 50 }),
    traffickerName: varchar("trafficker_name", { length: 255 }),
    salespersonId: varchar("salesperson_id", { length: 50 }),
    salespersonName: varchar("salesperson_name", { length: 255 }),

    status: varchar("status", { length: 20 }).notNull(),
    startDate: timestamp("start_date", { withTimezone: true }),
    endDate: timestamp("end_date", { withTimezone: true }),
    unlimitedEndDate: boolean("unlimited_end_date").notNull().default(false),

    totalBudget: doublePrecision("total_budget"),
    currencyCode: varchar("currency_code", { length: 10 }),
    externalOrderId: varchar("external_order_id", { length: 100 }),
    poNumber: varchar("po_number", { length: 100 }),
    notes: text("notes"),
    lastModifiedDate: timestamp("last_modified_date", { withTimezone: true }),

    isProgrammatic: boolean("is_programmatic").notNull().default(false),
    appliedLabels: jsonb("applied_labels").$type<unknown[]>(),
    effectiveAppliedLabels: jsonb("effective_applied_labels").$type<unknown[]>(),
    customFieldValues: jsonb("custom_field_values").$type<Record<string, unknown>>(),
    orderMetadata: jsonb("order_metadata").$type<Record<string, unknown>>(),

    lastSynced: timestamp("last_synced", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("uq_gam_orders").on(t.tenantId, t.orderId),
    index("idx_gam_orders_tenant").on(t.tenantId),
    index("idx_gam_orders_order_id").on(t.orderId),
    index("idx_gam_orders_status").on(t.status),
    index("idx_gam_orders_advertiser").on(t.advertiserId),
  ],
);

export type GamOrder = typeof gamOrders.$inferSelect;
export type NewGamOrder = typeof gamOrders.$inferInsert;

/**
 * Drizzle schema for the `gam_line_items` table.
 * 1:1 parity with the legacy SQLAlchemy GAMLineItem model:
 *   _legacy/src/core/database/models.py → class GAMLineItem(Base)
 *
 * Stores synced Google Ad Manager line items per tenant, linked to orders.
 */
export const gamLineItems = pgTable(
  "gam_line_items",
  {
    id: serial("id").primaryKey(),

    tenantId: varchar("tenant_id", { length: 50 })
      .notNull()
      .references(() => tenants.tenantId, { onDelete: "cascade" }),

    lineItemId: varchar("line_item_id", { length: 50 }).notNull(),
    orderId: varchar("order_id", { length: 50 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),

    status: varchar("status", { length: 30 }).notNull(),
    lineItemType: varchar("line_item_type", { length: 30 }).notNull(),
    priority: integer("priority"),

    startDate: timestamp("start_date", { withTimezone: true }),
    endDate: timestamp("end_date", { withTimezone: true }),
    unlimitedEndDate: boolean("unlimited_end_date").notNull().default(false),
    autoExtensionDays: integer("auto_extension_days"),

    costType: varchar("cost_type", { length: 20 }),
    costPerUnit: doublePrecision("cost_per_unit"),
    discountType: varchar("discount_type", { length: 20 }),
    discount: doublePrecision("discount"),

    contractedUnitsBought: integer("contracted_units_bought"),
    deliveryRateType: varchar("delivery_rate_type", { length: 30 }),
    goalType: varchar("goal_type", { length: 20 }),
    primaryGoalType: varchar("primary_goal_type", { length: 20 }),
    primaryGoalUnits: integer("primary_goal_units"),

    impressionLimit: integer("impression_limit"),
    clickLimit: integer("click_limit"),
    targetPlatform: varchar("target_platform", { length: 20 }),
    environmentType: varchar("environment_type", { length: 20 }),

    allowOverbook: boolean("allow_overbook").notNull().default(false),
    skipInventoryCheck: boolean("skip_inventory_check").notNull().default(false),
    reserveAtCreation: boolean("reserve_at_creation").notNull().default(false),

    statsImpressions: integer("stats_impressions"),
    statsClicks: integer("stats_clicks"),
    statsCtr: doublePrecision("stats_ctr"),
    statsVideoCompletions: integer("stats_video_completions"),
    statsVideoStarts: integer("stats_video_starts"),
    statsViewableImpressions: integer("stats_viewable_impressions"),

    deliveryIndicatorType: varchar("delivery_indicator_type", { length: 30 }),
    deliveryData: jsonb("delivery_data").$type<Record<string, unknown>>(),
    targeting: jsonb("targeting").$type<Record<string, unknown>>(),
    creativePlaceholders: jsonb("creative_placeholders").$type<unknown[]>(),
    frequencyCaps: jsonb("frequency_caps").$type<unknown[]>(),
    appliedLabels: jsonb("applied_labels").$type<unknown[]>(),
    effectiveAppliedLabels: jsonb("effective_applied_labels").$type<unknown[]>(),
    customFieldValues: jsonb("custom_field_values").$type<Record<string, unknown>>(),
    thirdPartyMeasurementSettings: jsonb("third_party_measurement_settings").$type<Record<string, unknown>>(),
    videoMaxDuration: integer("video_max_duration"),
    lineItemMetadata: jsonb("line_item_metadata").$type<Record<string, unknown>>(),

    lastModifiedDate: timestamp("last_modified_date", { withTimezone: true }),
    creationDate: timestamp("creation_date", { withTimezone: true }),
    externalId: varchar("external_id", { length: 255 }),

    lastSynced: timestamp("last_synced", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("uq_gam_line_items").on(t.tenantId, t.lineItemId),
    index("idx_gam_line_items_tenant").on(t.tenantId),
    index("idx_gam_line_items_line_item_id").on(t.lineItemId),
    index("idx_gam_line_items_order_id").on(t.orderId),
    index("idx_gam_line_items_status").on(t.status),
    index("idx_gam_line_items_type").on(t.lineItemType),
  ],
);

export type GamLineItem = typeof gamLineItems.$inferSelect;
export type NewGamLineItem = typeof gamLineItems.$inferInsert;
