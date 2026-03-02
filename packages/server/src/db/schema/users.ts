/**
 * Drizzle schemas for the `users` and `tenant_auth_configs` tables.
 * 1:1 parity with the legacy SQLAlchemy User / TenantAuthConfig models:
 *   _legacy/src/core/database/models.py → class User(Base), TenantAuthConfig(Base)
 *
 * User.role is constrained to ('admin', 'manager', 'viewer') via CHECK.
 * TenantAuthConfig stores per-tenant OIDC/SSO configuration; the client secret
 * is stored encrypted at rest (Fernet encryption in the legacy system).
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

// ── Users ─────────────────────────────────────────────────────────────────── //
export const users = pgTable(
  "users",
  {
    userId: varchar("user_id", { length: 50 }).primaryKey(),

    tenantId: varchar("tenant_id", { length: 50 })
      .notNull()
      .references(() => tenants.tenantId, { onDelete: "cascade" }),

    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),

    // Values: admin | manager | viewer
    role: varchar("role", { length: 20 }).notNull(),

    googleId: varchar("google_id", { length: 255 }),

    createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
    lastLogin: timestamp("last_login", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => [
    check("ck_users_role", sql`${t.role} IN ('admin', 'manager', 'viewer')`),
    uniqueIndex("uq_users_tenant_email").on(t.tenantId, t.email),
    index("idx_users_tenant").on(t.tenantId),
    index("idx_users_email").on(t.email),
    index("idx_users_google_id").on(t.googleId),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// ── Tenant Auth Configs ────────────────────────────────────────────────────── //
// Per-tenant OIDC/SSO configuration.
export const tenantAuthConfigs = pgTable(
  "tenant_auth_configs",
  {
    id: serial("id").primaryKey(),

    tenantId: varchar("tenant_id", { length: 50 })
      .notNull()
      .unique()
      .references(() => tenants.tenantId, { onDelete: "cascade" }),

    oidcEnabled: boolean("oidc_enabled").notNull().default(false),
    oidcProvider: varchar("oidc_provider", { length: 50 }),      // google | microsoft | custom
    oidcDiscoveryUrl: varchar("oidc_discovery_url", { length: 500 }),
    oidcClientId: varchar("oidc_client_id", { length: 500 }),
    oidcClientSecretEncrypted: text("oidc_client_secret_encrypted"), // Fernet-encrypted
    oidcScopes: varchar("oidc_scopes", { length: 500 }).default("openid email profile"),
    oidcLogoutUrl: varchar("oidc_logout_url", { length: 500 }),

    oidcVerifiedAt: timestamp("oidc_verified_at", { withTimezone: true }),
    oidcVerifiedRedirectUri: varchar("oidc_verified_redirect_uri", { length: 500 }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("idx_tenant_auth_configs_tenant_id").on(t.tenantId),
  ],
);

export type TenantAuthConfig = typeof tenantAuthConfigs.$inferSelect;
export type NewTenantAuthConfig = typeof tenantAuthConfigs.$inferInsert;
