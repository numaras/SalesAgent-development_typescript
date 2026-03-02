/**
 * Drizzle schema for the `currency_limits` table.
 * 1:1 parity with the legacy SQLAlchemy CurrencyLimit model:
 *   _legacy/src/core/database/models.py → class CurrencyLimit(Base)
 *
 * All limits are per-package (not per media buy) to prevent buyers from
 * splitting large budgets across many packages/line items.
 *
 * Composite PK (tenant_id, currency_code) naturally enforces the unique
 * constraint, so a separate UNIQUE index is not added.
 */
import {
  index,
  numeric,
  pgTable,
  primaryKey,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants.js";

export const currencyLimits = pgTable(
  "currency_limits",
  {
    tenantId: varchar("tenant_id", { length: 50 })
      .notNull()
      .references(() => tenants.tenantId, { onDelete: "cascade" }),

    // ISO 4217 three-letter currency code, e.g. "USD", "EUR"
    currencyCode: varchar("currency_code", { length: 3 }).notNull(),

    // Minimum total budget per package/line item (stored as string to preserve precision)
    minPackageBudget: numeric("min_package_budget", { precision: 15, scale: 2 }),

    // Maximum daily spend per package/line item
    maxDailyPackageSpend: numeric("max_daily_package_spend", { precision: 15, scale: 2 }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.currencyCode] }),
    index("idx_currency_limits_tenant").on(t.tenantId),
  ],
);

export type CurrencyLimit = typeof currencyLimits.$inferSelect;
export type NewCurrencyLimit = typeof currencyLimits.$inferInsert;
