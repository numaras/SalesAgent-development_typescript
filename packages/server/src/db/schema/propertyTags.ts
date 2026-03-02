/**
 * Drizzle schema for the `property_tags` table.
 * 1:1 parity with the legacy SQLAlchemy PropertyTag model:
 *   _legacy/src/core/database/models.py → class PropertyTag(Base)
 */
import { index, pgTable, primaryKey, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants.js";

export const propertyTags = pgTable(
  "property_tags",
  {
    tagId: varchar("tag_id", { length: 50 }).notNull(),
    tenantId: varchar("tenant_id", { length: 50 })
      .notNull()
      .references(() => tenants.tenantId, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    primaryKey({ columns: [t.tagId, t.tenantId] }),
    index("idx_property_tags_tenant").on(t.tenantId),
  ],
);

export type PropertyTag = typeof propertyTags.$inferSelect;
export type NewPropertyTag = typeof propertyTags.$inferInsert;
