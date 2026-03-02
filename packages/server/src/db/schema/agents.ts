/**
 * Drizzle schemas for `creative_agents` and `signals_agents` tables.
 * 1:1 parity with the legacy SQLAlchemy models:
 *   _legacy/src/core/database/models.py → class CreativeAgent(Base), SignalsAgent(Base)
 *
 * Both tables follow the same pattern: per-tenant agent registrations with
 * URL, auth credentials, priority, and enabled flag.
 */
import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants.js";

// ── Creative Agents ────────────────────────────────────────────────────────── //
// Each tenant can register custom creative agents in addition to the default
// AdCP creative agent at https://creative.adcontextprotocol.org
export const creativeAgents = pgTable(
  "creative_agents",
  {
    id: serial("id").primaryKey(),

    tenantId: varchar("tenant_id", { length: 50 })
      .notNull()
      .references(() => tenants.tenantId, { onDelete: "cascade" }),

    agentUrl: varchar("agent_url", { length: 500 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    enabled: boolean("enabled").notNull().default(true),
    priority: integer("priority").notNull().default(10),

    // Auth configuration for calling the agent
    authType: varchar("auth_type", { length: 50 }),          // bearer | api_key | none
    authHeader: varchar("auth_header", { length: 100 }),     // e.g. "Authorization", "x-api-key"
    authCredentials: text("auth_credentials"),               // Secret / token (stored as-is)

    timeout: integer("timeout").notNull().default(30),       // seconds

    createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
  },
  (t) => [
    index("idx_creative_agents_tenant").on(t.tenantId),
    index("idx_creative_agents_enabled").on(t.enabled),
  ],
);

export type CreativeAgent = typeof creativeAgents.$inferSelect;
export type NewCreativeAgent = typeof creativeAgents.$inferInsert;

// ── Signals Agents ─────────────────────────────────────────────────────────── //
// Per-tenant signals discovery agent configuration. Priority and
// max_signal_products are configured per-product, not per-agent.
export const signalsAgents = pgTable(
  "signals_agents",
  {
    id: serial("id").primaryKey(),

    tenantId: varchar("tenant_id", { length: 50 })
      .notNull()
      .references(() => tenants.tenantId, { onDelete: "cascade" }),

    agentUrl: varchar("agent_url", { length: 500 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    enabled: boolean("enabled").notNull().default(true),

    authType: varchar("auth_type", { length: 50 }),          // bearer | api_key | etc.
    authHeader: varchar("auth_header", { length: 100 }),     // e.g. "x-api-key", "Authorization"
    authCredentials: text("auth_credentials"),

    // When true, the promoted offering from this agent is forwarded to buyers
    forwardPromotedOffering: boolean("forward_promoted_offering").notNull().default(true),

    timeout: integer("timeout").notNull().default(30),

    createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
  },
  (t) => [
    index("idx_signals_agents_tenant").on(t.tenantId),
    index("idx_signals_agents_enabled").on(t.enabled),
  ],
);

export type SignalsAgent = typeof signalsAgents.$inferSelect;
export type NewSignalsAgent = typeof signalsAgents.$inferInsert;
