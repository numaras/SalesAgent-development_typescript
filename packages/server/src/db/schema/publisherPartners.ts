/**
 * Drizzle schema for the `publisher_partners` table.
 * 1:1 parity with the legacy SQLAlchemy PublisherPartner model:
 *   _legacy/src/core/database/models.py → class PublisherPartner(Base)
 *
 * Tracks publisher domains a tenant has partnerships with, plus the
 * verification state of the tenant's agent listing in each publisher's
 * adagents.json. Property IDs are fetched live (not cached here).
 */
import {
  boolean,
  check,
  index,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants.js";

export const publisherPartners = pgTable(
  "publisher_partners",
  {
    id: serial("id").primaryKey(),

    tenantId: varchar("tenant_id", { length: 50 })
      .notNull()
      .references(() => tenants.tenantId, { onDelete: "cascade" }),

    publisherDomain: varchar("publisher_domain", { length: 255 }).notNull(),
    displayName: varchar("display_name", { length: 255 }),

    isVerified: boolean("is_verified").notNull().default(false),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),

    // Values: pending | success | error
    syncStatus: varchar("sync_status", { length: 20 }).notNull().default("pending"),
    syncError: text("sync_error"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("uq_tenant_publisher").on(t.tenantId, t.publisherDomain),
    check("ck_sync_status", sql`${t.syncStatus} IN ('pending', 'success', 'error')`),
    index("idx_publisher_partners_tenant").on(t.tenantId),
    index("idx_publisher_partners_domain").on(t.publisherDomain),
    index("idx_publisher_partners_verified").on(t.isVerified),
  ],
);

export type PublisherPartner = typeof publisherPartners.$inferSelect;
export type NewPublisherPartner = typeof publisherPartners.$inferInsert;
