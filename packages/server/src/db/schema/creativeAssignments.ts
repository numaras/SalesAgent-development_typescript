/**
 * Drizzle schema for `creative_assignments`.
 *
 * This table maps creatives to media buy packages and is read by:
 * - admin creatives review/list pages
 * - media buy detail/workflow routes
 */
import {
  index,
  integer,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants.js";
import { creatives } from "./creatives.js";
import { mediaBuys } from "./mediaBuys.js";

export const creativeAssignments = pgTable(
  "creative_assignments",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    tenantId: varchar("tenant_id", { length: 50 })
      .notNull()
      .references(() => tenants.tenantId, { onDelete: "cascade" }),
    creativeId: varchar("creative_id", { length: 100 })
      .notNull()
      .references(() => creatives.creativeId, { onDelete: "cascade" }),
    mediaBuyId: varchar("media_buy_id", { length: 100 })
      .notNull()
      .references(() => mediaBuys.mediaBuyId, { onDelete: "cascade" }),
    packageId: varchar("package_id", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("idx_creative_assignments_tenant").on(t.tenantId),
    index("idx_creative_assignments_media_buy").on(t.mediaBuyId),
    index("idx_creative_assignments_creative").on(t.creativeId),
    index("idx_creative_assignments_package").on(t.packageId),
  ],
);

export type CreativeAssignment = typeof creativeAssignments.$inferSelect;
export type NewCreativeAssignment = typeof creativeAssignments.$inferInsert;
