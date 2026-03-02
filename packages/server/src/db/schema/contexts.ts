/**
 * Drizzle schema for the `contexts` table.
 * 1:1 parity with the legacy SQLAlchemy Context model:
 *   _legacy/src/core/database/models.py → class Context(Base)
 *
 * Used to scope workflow_steps by tenant_id and principal_id.
 */
import { index, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants.js";

export const contexts = pgTable(
  "contexts",
  {
    contextId: varchar("context_id", { length: 100 }).primaryKey(),
    tenantId: varchar("tenant_id", { length: 50 })
      .notNull()
      .references(() => tenants.tenantId, { onDelete: "cascade" }),
    principalId: varchar("principal_id", { length: 50 }).notNull(),

    conversationHistory: jsonb("conversation_history")
      .notNull()
      .default(sql`'[]'::jsonb`)
      .$type<Record<string, unknown>[]>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("idx_contexts_tenant").on(t.tenantId),
    index("idx_contexts_principal").on(t.principalId),
    index("idx_contexts_last_activity").on(t.lastActivityAt),
  ],
);

export type Context = typeof contexts.$inferSelect;
export type NewContext = typeof contexts.$inferInsert;
