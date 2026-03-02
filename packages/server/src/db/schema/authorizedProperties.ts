/**
 * Drizzle schema for the `authorized_properties` table.
 * 1:1 parity with the legacy SQLAlchemy AuthorizedProperty model:
 *   _legacy/src/core/database/models.py → class AuthorizedProperty(Base)
 */
import {
  check,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants.js";

export const authorizedProperties = pgTable(
  "authorized_properties",
  {
    propertyId: varchar("property_id", { length: 100 }).notNull(),
    tenantId: varchar("tenant_id", { length: 50 })
      .notNull()
      .references(() => tenants.tenantId, { onDelete: "cascade" }),

    propertyType: varchar("property_type", { length: 20 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    identifiers: jsonb("identifiers").notNull().$type<Array<Record<string, unknown>>>(),
    tags: jsonb("tags").$type<string[]>(),
    publisherDomain: varchar("publisher_domain", { length: 255 }).notNull(),

    verificationStatus: varchar("verification_status", { length: 20 }).notNull().default("pending"),
    verificationCheckedAt: timestamp("verification_checked_at", { withTimezone: true }),
    verificationError: text("verification_error"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    primaryKey({ columns: [t.propertyId, t.tenantId] }),
    check(
      "ck_property_type",
      sql`${t.propertyType} IN ('website', 'mobile_app', 'ctv_app', 'dooh', 'podcast', 'radio', 'streaming_audio')`,
    ),
    check(
      "ck_verification_status",
      sql`${t.verificationStatus} IN ('pending', 'verified', 'failed')`,
    ),
    index("idx_authorized_properties_tenant").on(t.tenantId),
    index("idx_authorized_properties_domain").on(t.publisherDomain),
    index("idx_authorized_properties_type").on(t.propertyType),
    index("idx_authorized_properties_verification").on(t.verificationStatus),
  ],
);

export type AuthorizedProperty = typeof authorizedProperties.$inferSelect;
export type NewAuthorizedProperty = typeof authorizedProperties.$inferInsert;
