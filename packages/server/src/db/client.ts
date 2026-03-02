/**
 * Drizzle client factory.
 *
 * Legacy equivalent: _legacy/src/core/database/database_session.py
 *   - Uses SQLAlchemy connection pooling (pool_size=5, max_overflow=10)
 *   - DATABASE_URL env var (PostgreSQL only — no SQLite)
 *   - Context-manager based sessions: `with get_db_session() as session:`
 *
 * TypeScript equivalent:
 *   - `postgres` driver (node-postgres compatible, pooled by default)
 *   - `drizzle-orm/postgres-js` adapter
 *   - Module-level singleton pool – import `db` for query-builder access
 *   - `getDb()` factory for cases that need a fresh client (tests, migrations)
 *
 * Connection string priority:
 *   DATABASE_URL > individual POSTGRES_* env vars
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema/index.js";

export type Db = ReturnType<typeof drizzle<typeof schema>>;

function buildConnectionString(): string {
  if (process.env["DATABASE_URL"]) {
    return process.env["DATABASE_URL"];
  }

  const host = process.env["POSTGRES_HOST"] ?? "localhost";
  const port = process.env["POSTGRES_PORT"] ?? "5432";
  const user = process.env["POSTGRES_USER"] ?? "postgres";
  const password = process.env["POSTGRES_PASSWORD"] ?? "postgres";
  const dbName = process.env["POSTGRES_DB"] ?? "salesagent";

  return `postgresql://${user}:${password}@${host}:${port}/${dbName}`;
}

/**
 * Create a new Drizzle client with its own connection pool.
 * Use the module-level `db` singleton for application code.
 * Call `getDb()` when you need an isolated client (e.g. in tests).
 */
export function getDb(connectionString?: string): { db: Db; sql: postgres.Sql } {
  const connStr = connectionString ?? buildConnectionString();

  const sql = postgres(connStr, {
    max: parseInt(process.env["DB_POOL_SIZE"] ?? "5", 10),
    idle_timeout: 30,
    connect_timeout: 10,
  });

  const db = drizzle(sql, { schema });

  return { db, sql };
}

// ── Module-level singleton ─────────────────────────────────────────────────── //
// Shared across the entire process; torn down on SIGTERM / SIGINT in server.ts.
const { db, sql: _sqlClient } = getDb();

export { db };

/** Close the singleton pool — call on graceful shutdown. */
export async function closeDb(): Promise<void> {
  await _sqlClient.end();
}

/**
 * Reset the connection pool (testing only).
 *
 * Legacy equivalent: _legacy/src/core/database/database_session.py → reset_engine()
 *   Disposes the SQLAlchemy pool so the next get_db_session() gets fresh connections.
 *
 * With postgres.js we have a single module-level pool; a full "reset" would require
 * ending and re-creating it (and updating the exported `db`). For E2E tests that
 * need fresh connections after external data changes, call this no-op for now;
 * implement actual pool recreation in a follow-up if required.
 */
export async function resetDbPool(): Promise<void> {
  // No-op: postgres.js does not expose a per-connection flush. Optionally
  // call closeDb() then re-init in a test harness; for the route we just succeed.
}
