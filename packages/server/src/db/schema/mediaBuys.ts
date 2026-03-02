/**
 * Drizzle schema for the `media_buys` table.
 * 1:1 parity with the legacy SQLAlchemy MediaBuy model:
 *   _legacy/src/core/database/models.py → class MediaBuy(Base)
 *
 * Composite FK (tenant_id, principal_id) → principals.
 * strategy_id FK to strategies is left unconstrained here (strategies table is
 * outside the core migration scope; constraint exists in the DB via Python migrations).
 */
import {
  date,
  index,
  jsonb,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants.js";
import { principals } from "./principals.js";

export const mediaBuys = pgTable(
  "media_buys",
  {
    mediaBuyId: varchar("media_buy_id", { length: 100 }).primaryKey(),

    tenantId: varchar("tenant_id", { length: 50 })
      .notNull()
      .references(() => tenants.tenantId, { onDelete: "cascade" }),
    principalId: varchar("principal_id", { length: 50 }).notNull(),

    buyerRef: varchar("buyer_ref", { length: 100 }),
    orderName: varchar("order_name", { length: 255 }).notNull(),
    advertiserName: varchar("advertiser_name", { length: 255 }).notNull(),
    campaignObjective: varchar("campaign_objective", { length: 100 }),
    kpiGoal: varchar("kpi_goal", { length: 255 }),

    // DECIMAL(15,2) for monetary amounts; stored as string in JS to preserve precision
    budget: numeric("budget", { precision: 15, scale: 2 }),
    currency: varchar("currency", { length: 3 }).default("USD"),

    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    startTime: timestamp("start_time", { withTimezone: true }),
    endTime: timestamp("end_time", { withTimezone: true }),

    status: varchar("status", { length: 20 }).notNull().default("draft"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),

    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: varchar("approved_by", { length: 255 }),

    rawRequest: jsonb("raw_request").notNull().$type<Record<string, unknown>>(),

    // FK to strategies.strategy_id (SET NULL); strategies table is out of scope
    strategyId: varchar("strategy_id", { length: 255 }),
  },
  (t) => [
    // Composite FK enforced at DB level via Python migration
    index("idx_media_buys_tenant").on(t.tenantId),
    index("idx_media_buys_status").on(t.status),
    index("idx_media_buys_strategy").on(t.strategyId),
    index("idx_media_buys_buyer_ref").on(t.buyerRef),
    uniqueIndex("uq_media_buys_buyer_ref").on(t.tenantId, t.principalId, t.buyerRef),
  ],
);

// Drizzle relation helper (not a DB constraint – used by query builder)
export type MediaBuy = typeof mediaBuys.$inferSelect;
export type NewMediaBuy = typeof mediaBuys.$inferInsert;

// ── MediaPackage (child table) ────────────────────────────────────────────── //
// Defined here because it's tightly coupled to mediaBuys.
export const mediaPackages = pgTable(
  "media_packages",
  {
    mediaBuyId: varchar("media_buy_id", { length: 100 })
      .notNull()
      .references(() => mediaBuys.mediaBuyId, { onDelete: "cascade" }),
    packageId: varchar("package_id", { length: 100 }).notNull(),

    budget: numeric("budget", { precision: 15, scale: 2 }),
    bidPrice: numeric("bid_price", { precision: 15, scale: 2 }),
    // Full package structure (AdCP spec) stored for backward compatibility
    packageConfig: jsonb("package_config").$type<Record<string, unknown>>(),
  },
  (t) => [
    index("idx_media_packages_buy").on(t.mediaBuyId),
  ],
);

export type MediaPackage = typeof mediaPackages.$inferSelect;
export type NewMediaPackage = typeof mediaPackages.$inferInsert;
