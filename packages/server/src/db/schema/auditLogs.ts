/**
 * Drizzle schema for the `audit_logs` table.
 * 1:1 parity with the legacy SQLAlchemy AuditLog model:
 *   _legacy/src/core/database/models.py → class AuditLog(Base)
 *
 * strategy_id FK to strategies.strategy_id (SET NULL) is left unconstrained here —
 * the strategies table is out of the TS migration scope; the constraint lives in
 * the DB via Python migrations.
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
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants.js";

export const auditLogs = pgTable(
  "audit_logs",
  {
    logId: serial("log_id").primaryKey(),

    tenantId: varchar("tenant_id", { length: 50 })
      .notNull()
      .references(() => tenants.tenantId, { onDelete: "cascade" }),

    timestamp: timestamp("timestamp", { withTimezone: true })
      .notNull()
      .default(sql`now()`),

    operation: varchar("operation", { length: 100 }).notNull(),
    principalName: varchar("principal_name", { length: 255 }),
    principalId: varchar("principal_id", { length: 50 }),
    adapterId: varchar("adapter_id", { length: 50 }),
    success: boolean("success").notNull(),
    errorMessage: text("error_message"),
    details: jsonb("details").$type<Record<string, unknown>>(),

    // FK to strategies.strategy_id (SET NULL) — strategies out of TS scope
    strategyId: varchar("strategy_id", { length: 255 }),
  },
  (t) => [
    index("idx_audit_logs_tenant").on(t.tenantId),
    index("idx_audit_logs_timestamp").on(t.timestamp),
    index("idx_audit_logs_strategy").on(t.strategyId),
  ],
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
