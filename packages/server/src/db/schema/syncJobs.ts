/**
 * Drizzle schema for the `sync_jobs` table.
 * Parity with _legacy SyncJob model (sync_jobs table).
 */
import { index, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants.js";

export const syncJobs = pgTable(
  "sync_jobs",
  {
    syncId: varchar("sync_id", { length: 100 }).primaryKey(),
    tenantId: varchar("tenant_id", { length: 50 })
      .notNull()
      .references(() => tenants.tenantId, { onDelete: "cascade" }),
    adapterType: varchar("adapter_type", { length: 50 }).notNull(),
    syncType: varchar("sync_type", { length: 20 }).notNull(),
    status: varchar("status", { length: 20 }).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().default(sql`now()`),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    summary: text("summary"),
    errorMessage: text("error_message"),
    triggeredBy: varchar("triggered_by", { length: 50 }).notNull(),
    triggeredById: varchar("triggered_by_id", { length: 255 }),
    progress: text("progress"), // JSON string for real-time progress
  },
  (t) => [
    index("idx_sync_jobs_tenant").on(t.tenantId),
    index("idx_sync_jobs_status").on(t.status),
    index("idx_sync_jobs_started").on(t.startedAt),
  ]
);

export type SyncJobRow = typeof syncJobs.$inferSelect;
export type NewSyncJobRow = typeof syncJobs.$inferInsert;
