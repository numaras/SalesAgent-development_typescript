/**
 * Drizzle schema for the `principals` table.
 * 1:1 parity with the legacy SQLAlchemy Principal model:
 *   _legacy/src/core/database/models.py → class Principal(Base)
 *
 * A Principal is an API credential (advertiser / agency) that belongs to a Tenant.
 * Its access_token is the bearer token used for x-adcp-auth authentication.
 */
import {
  index,
  jsonb,
  pgTable,
  primaryKey,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants.js";

export const principals = pgTable(
  "principals",
  {
    tenantId: varchar("tenant_id", { length: 50 })
      .notNull()
      .references(() => tenants.tenantId, { onDelete: "cascade" }),
    principalId: varchar("principal_id", { length: 50 }).notNull(),

    name: varchar("name", { length: 200 }).notNull(),

    // Maps platform name → advertiser/agency ID in that platform
    // e.g. { "gam": "12345678", "kevel": "9876" }
    platformMappings: jsonb("platform_mappings")
      .notNull()
      .$type<Record<string, string>>(),

    accessToken: varchar("access_token", { length: 255 }).notNull().unique(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.principalId] }),
    index("idx_principals_tenant").on(t.tenantId),
    index("idx_principals_token").on(t.accessToken),
  ],
);

export type Principal = typeof principals.$inferSelect;
export type NewPrincipal = typeof principals.$inferInsert;
