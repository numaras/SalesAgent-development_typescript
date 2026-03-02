/**
 * Drizzle schema for the `adapter_config` table.
 * 1:1 parity with the legacy SQLAlchemy AdapterConfig model:
 *   _legacy/src/core/database/models.py → class AdapterConfig(Base)
 *
 * Stores per-tenant adapter configuration for GAM, Kevel, Mock, Triton etc.
 * The gam_service_account_json column stores encrypted data at rest.
 */
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants.js";

export const adapterConfigs = pgTable(
  "adapter_config",
  {
    tenantId: varchar("tenant_id", { length: 50 })
      .primaryKey()
      .references(() => tenants.tenantId, { onDelete: "cascade" }),

    adapterType: varchar("adapter_type", { length: 50 }).notNull(),

    // ── Mock adapter ──────────────────────────────────────────────────── //
    mockDryRun: boolean("mock_dry_run"),
    mockManualApprovalRequired: boolean("mock_manual_approval_required")
      .notNull()
      .default(false),

    // ── Google Ad Manager ─────────────────────────────────────────────── //
    gamNetworkCode: varchar("gam_network_code", { length: 50 }),
    gamRefreshToken: text("gam_refresh_token"),
    // Stored encrypted; use service layer to decrypt before use
    gamServiceAccountJson: text("gam_service_account_json"),
    gamServiceAccountEmail: varchar("gam_service_account_email", { length: 255 }),
    gamAuthMethod: varchar("gam_auth_method", { length: 50 })
      .notNull()
      .default("oauth"),
    gamTrafickerId: varchar("gam_trafficker_id", { length: 50 }),
    gamNetworkCurrency: varchar("gam_network_currency", { length: 3 }),
    gamSecondaryCurrencies: jsonb("gam_secondary_currencies").$type<string[]>(),
    gamNetworkTimezone: varchar("gam_network_timezone", { length: 100 }),
    gamManualApprovalRequired: boolean("gam_manual_approval_required")
      .notNull()
      .default(false),
    gamOrderNameTemplate: varchar("gam_order_name_template", { length: 500 }),
    gamLineItemNameTemplate: varchar("gam_line_item_name_template", { length: 500 }),

    // ── AXE (Audience Exchange) custom targeting keys ─────────────────── //
    axeIncludeKey: varchar("axe_include_key", { length: 100 }),
    axeExcludeKey: varchar("axe_exclude_key", { length: 100 }),
    axeMacroKey: varchar("axe_macro_key", { length: 100 }),

    // Maps key names → platform custom targeting key IDs
    customTargetingKeys: jsonb("custom_targeting_keys")
      .notNull()
      .default(sql`'{}'::jsonb`)
      .$type<Record<string, string>>(),

    // ── Kevel ─────────────────────────────────────────────────────────── //
    kevelNetworkId: varchar("kevel_network_id", { length: 50 }),
    kevelApiKey: varchar("kevel_api_key", { length: 100 }),
    kevelManualApprovalRequired: boolean("kevel_manual_approval_required")
      .notNull()
      .default(false),

    // ── Triton ────────────────────────────────────────────────────────── //
    tritonStationId: varchar("triton_station_id", { length: 50 }),
    tritonApiKey: varchar("triton_api_key", { length: 100 }),

    // ── Schema-driven config (coexists with legacy columns) ───────────── //
    configJson: jsonb("config_json")
      .notNull()
      .default(sql`'{}'::jsonb`)
      .$type<Record<string, unknown>>(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("idx_adapter_config_type").on(t.adapterType)],
);

export type AdapterConfig = typeof adapterConfigs.$inferSelect;
export type NewAdapterConfig = typeof adapterConfigs.$inferInsert;
