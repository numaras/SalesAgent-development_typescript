/**
 * Drizzle schema for the `inventory_profiles` table.
 * 1:1 parity with the legacy SQLAlchemy InventoryProfile model:
 *   _legacy/src/core/database/models.py → class InventoryProfile(Base)
 *
 * A reusable inventory configuration template. Multiple products can reference
 * the same profile — when the profile is updated all products reflect the change.
 *
 * Note: products.inventoryProfileId (DB-004) references this table's `id`; the
 * FK constraint lives in the DB via Python migrations. No circular import here
 * because products.ts leaves that column unconstrained.
 */
import {
  boolean,
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

// ── Supporting interfaces for well-typed jsonb columns ─────────────────────── //
interface InventoryConfig {
  ad_units?: string[];
  placements?: string[];
  include_descendants?: boolean;
}

interface FormatId {
  agent_url: string;
  id: string;
}

interface PublisherProperty {
  publisher_domain: string;
  property_ids?: string[];
  property_tags?: string[];
}

export const inventoryProfiles = pgTable(
  "inventory_profiles",
  {
    id: serial("id").primaryKey(),

    tenantId: varchar("tenant_id", { length: 50 })
      .notNull()
      .references(() => tenants.tenantId, { onDelete: "cascade" }),

    profileId: varchar("profile_id", { length: 100 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),

    // Inventory (ad units + placements)
    inventoryConfig: jsonb("inventory_config")
      .notNull()
      .$type<InventoryConfig>(),

    // Creative formats compatible with this inventory
    formatIds: jsonb("format_ids")
      .notNull()
      .$type<FormatId[]>(),

    // Publisher properties (AdCP spec-compliant)
    publisherProperties: jsonb("publisher_properties")
      .notNull()
      .$type<PublisherProperty[]>(),

    // Optional default targeting template (AdCP targeting object)
    targetingTemplate: jsonb("targeting_template")
      .$type<Record<string, unknown>>(),

    // Optional GAM integration
    gamPresetId: varchar("gam_preset_id", { length: 100 }),
    gamPresetSyncEnabled: boolean("gam_preset_sync_enabled")
      .notNull()
      .default(false),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("uq_inventory_profile").on(t.tenantId, t.profileId),
    index("idx_inventory_profiles_tenant").on(t.tenantId),
  ],
);

export type InventoryProfile = typeof inventoryProfiles.$inferSelect;
export type NewInventoryProfile = typeof inventoryProfiles.$inferInsert;
