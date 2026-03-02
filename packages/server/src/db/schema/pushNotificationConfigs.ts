/**
 * Drizzle schema for the `push_notification_configs` table.
 * Parity with legacy PushNotificationConfig model.
 */
import { boolean, index, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { principals } from "./principals.js";
import { tenants } from "./tenants.js";

export const pushNotificationConfigs = pgTable(
  "push_notification_configs",
  {
    id: varchar("id", { length: 50 }).primaryKey(),
    tenantId: varchar("tenant_id", { length: 50 })
      .notNull()
      .references(() => tenants.tenantId, { onDelete: "cascade" }),
    principalId: varchar("principal_id", { length: 50 }).notNull(),
    sessionId: varchar("session_id", { length: 100 }),
    url: text("url").notNull(),
    authenticationType: varchar("authentication_type", { length: 50 }),
    authenticationToken: text("authentication_token"),
    validationToken: text("validation_token"),
    webhookSecret: varchar("webhook_secret", { length: 500 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => [
    index("idx_push_notification_configs_tenant").on(t.tenantId),
    index("idx_push_notification_configs_principal").on(t.tenantId, t.principalId),
  ],
);

// Composite FK (tenant_id, principal_id) -> principals; DB may enforce via migration
export type PushNotificationConfig = typeof pushNotificationConfigs.$inferSelect;
export type NewPushNotificationConfig = typeof pushNotificationConfigs.$inferInsert;
