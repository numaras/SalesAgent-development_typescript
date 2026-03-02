/**
 * Drizzle schema for the `tenants` table.
 * 1:1 parity with the legacy SQLAlchemy Tenant model:
 *   _legacy/src/core/database/models.py → class Tenant(Base)
 */
import {
  boolean,
  doublePrecision,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const tenants = pgTable("tenants", {
  tenantId: varchar("tenant_id", { length: 50 }).primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  subdomain: varchar("subdomain", { length: 100 }).notNull().unique(),
  virtualHost: text("virtual_host"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),

  isActive: boolean("is_active").notNull().default(true),
  billingPlan: varchar("billing_plan", { length: 50 }).notNull().default("standard"),
  billingContact: varchar("billing_contact", { length: 255 }),

  adServer: varchar("ad_server", { length: 50 }),
  enableAxeSignals: boolean("enable_axe_signals").notNull().default(true),

  authorizedEmails: jsonb("authorized_emails").$type<string[]>(),
  authorizedDomains: jsonb("authorized_domains").$type<string[]>(),

  slackWebhookUrl: varchar("slack_webhook_url", { length: 500 }),
  slackAuditWebhookUrl: varchar("slack_audit_webhook_url", { length: 500 }),
  hitlWebhookUrl: varchar("hitl_webhook_url", { length: 500 }),

  adminToken: varchar("admin_token", { length: 100 }),

  autoApproveFormatIds: jsonb("auto_approve_format_ids").$type<string[]>(),
  humanReviewRequired: boolean("human_review_required").notNull().default(true),

  policySettings: jsonb("policy_settings").$type<Record<string, unknown>>(),
  signalsAgentConfig: jsonb("signals_agent_config").$type<Record<string, unknown>>(),
  creativeReviewCriteria: text("creative_review_criteria"),

  geminiApiKey: varchar("gemini_api_key", { length: 500 }),

  approvalMode: varchar("approval_mode", { length: 50 }).notNull().default("require-human"),
  creativeAutoApproveThreshold: doublePrecision("creative_auto_approve_threshold")
    .notNull()
    .default(0.9),
  creativeAutoRejectThreshold: doublePrecision("creative_auto_reject_threshold")
    .notNull()
    .default(0.1),

  aiPolicy: jsonb("ai_policy").$type<Record<string, unknown>>(),
  advertisingPolicy: jsonb("advertising_policy").$type<Record<string, unknown>>(),

  aiConfig: jsonb("ai_config").$type<Record<string, unknown>>(),

  orderNameTemplate: varchar("order_name_template", { length: 500 }).default(
    "{campaign_name|brand_name} - {buyer_ref} - {date_range}",
  ),
  lineItemNameTemplate: varchar("line_item_name_template", { length: 500 }).default(
    "{order_name} - {product_name}",
  ),

  measurementProviders: jsonb("measurement_providers").$type<Record<string, unknown>>(),

  brandManifestPolicy: varchar("brand_manifest_policy", { length: 50 })
    .notNull()
    .default("require_auth"),

  authSetupMode: boolean("auth_setup_mode").notNull().default(true),

  productRankingPrompt: text("product_ranking_prompt"),
  faviconUrl: varchar("favicon_url", { length: 500 }),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
