/**
 * Drizzle schema for the `superadmin_config` table (legacy TenantManagementConfig).
 * Used for tenant management API key and other super-admin config.
 */
import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const tenantManagementConfig = pgTable("superadmin_config", {
  configKey: varchar("config_key", { length: 100 }).primaryKey(),
  configValue: text("config_value"),
  description: text("description"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedBy: varchar("updated_by", { length: 255 }),
});

export type TenantManagementConfigRow = typeof tenantManagementConfig.$inferSelect;
export type NewTenantManagementConfigRow = typeof tenantManagementConfig.$inferInsert;
