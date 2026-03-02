/**
 * Drizzle schemas for `workflow_steps` and `object_workflow_mapping` tables.
 * 1:1 parity with the legacy SQLAlchemy WorkflowStep / ObjectWorkflowMapping models:
 *   _legacy/src/core/database/models.py → class WorkflowStep(Base), ObjectWorkflowMapping(Base)
 *
 * WorkflowStep.context_id references `contexts.context_id` — the contexts table is a
 * legacy Python concept outside the TS migration scope. The column is preserved for
 * DB parity; the FK constraint lives in the DB via Python migrations only.
 */
import {
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── Workflow Steps ─────────────────────────────────────────────────────────── //
export const workflowSteps = pgTable(
  "workflow_steps",
  {
    stepId: varchar("step_id", { length: 100 }).primaryKey(),

    // FK to contexts.context_id (CASCADE) — contexts table is out of TS scope;
    // constraint is maintained by the DB and Python migrations.
    contextId: varchar("context_id", { length: 100 }).notNull(),

    stepType: varchar("step_type", { length: 50 }).notNull(),
    toolName: varchar("tool_name", { length: 100 }),

    requestData: jsonb("request_data").$type<Record<string, unknown>>(),
    responseData: jsonb("response_data").$type<Record<string, unknown>>(),

    // Values: pending | in_progress | completed | failed | requires_approval
    status: varchar("status", { length: 20 }).notNull().default("pending"),

    // Values: principal | publisher | system
    owner: varchar("owner", { length: 20 }).notNull(),
    assignedTo: varchar("assigned_to", { length: 255 }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    completedAt: timestamp("completed_at", { withTimezone: true }),

    errorMessage: text("error_message"),
    transactionDetails: jsonb("transaction_details").$type<Record<string, unknown>>(),

    // Array of { user, timestamp, comment } objects
    comments: jsonb("comments")
      .notNull()
      .default(sql`'[]'::jsonb`)
      .$type<Array<{ user: string; timestamp: string; comment: string }>>(),
  },
  (t) => [
    index("idx_workflow_steps_context").on(t.contextId),
    index("idx_workflow_steps_status").on(t.status),
    index("idx_workflow_steps_owner").on(t.owner),
    index("idx_workflow_steps_assigned").on(t.assignedTo),
    index("idx_workflow_steps_created").on(t.createdAt),
  ],
);

export type WorkflowStep = typeof workflowSteps.$inferSelect;
export type NewWorkflowStep = typeof workflowSteps.$inferInsert;

// ── Object → Workflow Mapping ──────────────────────────────────────────────── //
// Allows tracking all CRUD operations and workflow steps for any object
// (media_buy, creative, product, etc.) without tight coupling.
export const objectWorkflowMappings = pgTable(
  "object_workflow_mapping",
  {
    id: serial("id").primaryKey(),

    objectType: varchar("object_type", { length: 50 }).notNull(),
    objectId: varchar("object_id", { length: 100 }).notNull(),

    stepId: varchar("step_id", { length: 100 })
      .notNull()
      .references(() => workflowSteps.stepId, { onDelete: "cascade" }),

    action: varchar("action", { length: 50 }).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("idx_object_workflow_type_id").on(t.objectType, t.objectId),
    index("idx_object_workflow_step").on(t.stepId),
    index("idx_object_workflow_created").on(t.createdAt),
  ],
);

export type ObjectWorkflowMapping = typeof objectWorkflowMappings.$inferSelect;
export type NewObjectWorkflowMapping = typeof objectWorkflowMappings.$inferInsert;
