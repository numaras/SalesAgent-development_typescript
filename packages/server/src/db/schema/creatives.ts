/**
 * Drizzle schemas for `creatives` and `creative_reviews` tables.
 * 1:1 parity with the legacy SQLAlchemy Creative / CreativeReview models:
 *   _legacy/src/core/database/models.py → class Creative(Base), CreativeReview(Base)
 */
import {
  boolean,
  doublePrecision,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants.js";

// ── Creatives ─────────────────────────────────────────────────────────────── //
export const creatives = pgTable(
  "creatives",
  {
    creativeId: varchar("creative_id", { length: 100 }).primaryKey(),

    tenantId: varchar("tenant_id", { length: 50 })
      .notNull()
      .references(() => tenants.tenantId, { onDelete: "cascade" }),

    // Composite FK (tenant_id, principal_id) → principals; enforced by DB migration
    principalId: varchar("principal_id", { length: 100 }).notNull(),

    name: varchar("name", { length: 255 }).notNull(),
    agentUrl: varchar("agent_url", { length: 500 }).notNull(),
    format: varchar("format", { length: 100 }).notNull(),
    status: varchar("status", { length: 50 }).notNull().default("pending"),

    data: jsonb("data").notNull().default(sql`'{}'::jsonb`).$type<Record<string, unknown>>(),
    formatParameters: jsonb("format_parameters").$type<Record<string, unknown>>(),

    groupId: varchar("group_id", { length: 100 }),

    createdAt: timestamp("created_at", { withTimezone: true }).default(
      sql`current_timestamp`,
    ),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: varchar("approved_by", { length: 255 }),

    strategyId: varchar("strategy_id", { length: 255 }),
  },
  (t) => [
    index("idx_creatives_tenant").on(t.tenantId),
    index("idx_creatives_principal").on(t.tenantId, t.principalId),
    index("idx_creatives_status").on(t.status),
    index("idx_creatives_format_namespace").on(t.agentUrl, t.format),
  ],
);

export type Creative = typeof creatives.$inferSelect;
export type NewCreative = typeof creatives.$inferInsert;

// ── Creative Reviews ──────────────────────────────────────────────────────── //
export const creativeReviews = pgTable(
  "creative_reviews",
  {
    reviewId: varchar("review_id", { length: 100 }).primaryKey(),

    creativeId: varchar("creative_id", { length: 100 })
      .notNull()
      .references(() => creatives.creativeId, { onDelete: "cascade" }),
    tenantId: varchar("tenant_id", { length: 50 })
      .notNull()
      .references(() => tenants.tenantId, { onDelete: "cascade" }),

    reviewedAt: timestamp("reviewed_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    reviewType: varchar("review_type", { length: 20 }).notNull(),
    reviewerEmail: varchar("reviewer_email", { length: 255 }),

    aiDecision: varchar("ai_decision", { length: 20 }),
    confidenceScore: doublePrecision("confidence_score"),
    policyTriggered: varchar("policy_triggered", { length: 100 }),

    reason: text("reason"),
    recommendations: jsonb("recommendations").$type<Record<string, unknown>>(),

    humanOverride: boolean("human_override").notNull().default(false),
    finalDecision: varchar("final_decision", { length: 20 }).notNull(),
  },
  (t) => [
    index("ix_creative_reviews_creative_id").on(t.creativeId),
    index("ix_creative_reviews_tenant_id").on(t.tenantId),
  ],
);

export type CreativeReview = typeof creativeReviews.$inferSelect;
export type NewCreativeReview = typeof creativeReviews.$inferInsert;
