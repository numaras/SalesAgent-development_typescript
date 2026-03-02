/**
 * Process log endpoints — exposes a merged view of:
 *   1. Redis `process_logs` ring buffer (real-time processLogger output)
 *   2. `sync_jobs` DB table (historical job records, always available)
 *
 * REST:  GET /tenant/:id/process-logs          → last N entries (JSON)
 * SSE:   GET /tenant/:id/process-logs/stream   → live stream (text/event-stream)
 *
 * Both endpoints are scoped to a tenant: Redis entries show system-level
 * (no tenantId) and tenant-tagged entries; sync_jobs are always tenant-scoped.
 */
import { Redis } from "ioredis";
import { desc, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { requireTenantAccess } from "../../services/authGuard.js";
import { redisConnectionOptions } from "../../../jobs/queues.js";
import { PROCESS_LOGS_KEY } from "../../../utils/processLogger.js";
import type { ProcessLogEntry, LogLevel } from "../../../utils/processLogger.js";
import { db } from "../../../db/client.js";
import { syncJobs } from "../../../db/schema/syncJobs.js";

// ---------------------------------------------------------------------------
// Shared read-only Redis client (lazy singleton)
// ---------------------------------------------------------------------------

let _readRedis: Redis | null = null;

function getReadRedis(): Redis {
  if (_readRedis && (_readRedis.status === "ready" || _readRedis.status === "connecting")) {
    return _readRedis;
  }
  _readRedis = new Redis({
    ...redisConnectionOptions(),
    enableOfflineQueue: false,
    lazyConnect: false,
  });
  _readRedis.on("error", () => {
    // Suppress ioredis noise — errors surface as empty results to the client
  });
  return _readRedis;
}

// ---------------------------------------------------------------------------
// sync_jobs → ProcessLogEntry conversion
// ---------------------------------------------------------------------------

type SyncJobRow = {
  syncId: string;
  syncType: string;
  adapterType: string;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
  summary: string | null;
  errorMessage: string | null;
  triggeredBy: string;
  tenantId: string;
};

function syncJobToEntries(job: SyncJobRow): ProcessLogEntry[] {
  const entries: ProcessLogEntry[] = [];
  const baseMeta = {
    syncId: job.syncId,
    syncType: job.syncType,
    adapterType: job.adapterType,
    triggeredBy: job.triggeredBy,
    status: job.status,
  };

  // "Job queued / started" entry at startedAt
  entries.push({
    ts: job.startedAt.toISOString(),
    level: job.status === "failed" ? "error" : "info",
    process: "sync-jobs-db",
    tenantId: job.tenantId,
    message: `[${job.status}] ${job.syncType} sync — triggered by ${job.triggeredBy}`,
    meta: baseMeta,
  });

  // Additional entry at completedAt when the job finished
  if (job.completedAt && (job.status === "completed" || job.status === "failed")) {
    const durationSec = Math.round(
      (job.completedAt.getTime() - job.startedAt.getTime()) / 1000,
    );

    if (job.status === "completed") {
      let summaryStr = "";
      if (job.summary) {
        try {
          const s = JSON.parse(job.summary) as Record<string, unknown>;
          summaryStr = Object.entries(s)
            .filter(([k]) => k !== "sync_type")
            .map(([k, v]) => `${k}: ${String(v)}`)
            .join(", ");
        } catch {
          summaryStr = job.summary;
        }
      }
      entries.push({
        ts: job.completedAt.toISOString(),
        level: "info",
        process: "sync-jobs-db",
        tenantId: job.tenantId,
        message: `[done] ${job.syncType} sync completed in ${durationSec}s${summaryStr ? ` — ${summaryStr}` : ""}`,
        meta: { ...baseMeta, durationSec, summary: summaryStr },
      });
    } else {
      entries.push({
        ts: job.completedAt.toISOString(),
        level: "error",
        process: "sync-jobs-db",
        tenantId: job.tenantId,
        message: `[error] ${job.syncType} sync failed — ${job.errorMessage ?? "unknown error"}`,
        meta: { ...baseMeta, durationSec, error: job.errorMessage },
      });
    }
  }

  return entries;
}

async function fetchSyncJobEntries(tenantId: string, limit = 30): Promise<ProcessLogEntry[]> {
  const rows = await db
    .select()
    .from(syncJobs)
    .where(eq(syncJobs.tenantId, tenantId))
    .orderBy(desc(syncJobs.startedAt))
    .limit(limit);

  return rows.flatMap((r) => syncJobToEntries(r as SyncJobRow));
}

// ---------------------------------------------------------------------------
// Redis helpers
// ---------------------------------------------------------------------------

const VALID_LEVELS = new Set<string>(["debug", "info", "warn", "error"]);

function parseEntry(raw: string): ProcessLogEntry | null {
  try {
    return JSON.parse(raw) as ProcessLogEntry;
  } catch {
    return null;
  }
}

function entryMatchesTenant(entry: ProcessLogEntry, tenantId: string): boolean {
  return entry.tenantId === tenantId || entry.tenantId == null;
}

async function fetchRedisEntries(
  tenantId: string,
  opts: { limit?: number; level?: LogLevel; startIndex?: number } = {},
): Promise<ProcessLogEntry[]> {
  try {
    const redis = getReadRedis();
    const startIdx = opts.startIndex ?? 0;
    const raw = await redis.lrange(PROCESS_LOGS_KEY, startIdx, -1);
    const limit = Math.min(opts.limit ?? 200, 500);
    const entries: ProcessLogEntry[] = [];
    for (const r of raw) {
      const entry = parseEntry(r);
      if (!entry) continue;
      if (!entryMatchesTenant(entry, tenantId)) continue;
      if (opts.level && entry.level !== opts.level) continue;
      entries.push(entry);
    }
    return entries.slice(-limit);
  } catch {
    return [];
  }
}

/** Merge Redis + DB entries, sort by ts ascending, return last `limit`. */
function mergeEntries(redis: ProcessLogEntry[], db: ProcessLogEntry[], limit: number): ProcessLogEntry[] {
  const all = [...redis, ...db];
  all.sort((a, b) => a.ts.localeCompare(b.ts));
  return all.slice(-limit);
}

async function getListLen(): Promise<number> {
  try {
    return await getReadRedis().llen(PROCESS_LOGS_KEY);
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// SSE rate limiting
// ---------------------------------------------------------------------------

const MAX_SSE_CONNECTIONS_PER_TENANT = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;
const connectionTimestamps = new Map<string, number[]>();

function checkSseRateLimit(tenantId: string): boolean {
  const now = Date.now();
  const recent = (connectionTimestamps.get(tenantId) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  if (recent.length >= MAX_SSE_CONNECTIONS_PER_TENANT) return false;
  recent.push(now);
  connectionTimestamps.set(tenantId, recent);
  return true;
}

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

const processLogsRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // REST — last N merged entries snapshot
  fastify.get("/tenant/:id/process-logs", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!id || id.length > 50) return reply.code(400).send({ error: "Invalid tenant ID" });

    const allowed = await requireTenantAccess(request, reply, id);
    if (!allowed) return;

    const query = request.query as { limit?: string; level?: string };
    const limit = Math.min(parseInt(query.limit ?? "200", 10) || 200, 500);
    const level = VALID_LEVELS.has(query.level ?? "") ? (query.level as LogLevel) : undefined;

    try {
      const [redisEntries, dbEntries] = await Promise.all([
        fetchRedisEntries(id, { limit, level }),
        fetchSyncJobEntries(id),
      ]);
      const entries = mergeEntries(redisEntries, dbEntries, limit);
      return reply.send({ entries, count: entries.length, timestamp: new Date().toISOString() });
    } catch {
      return reply.code(500).send({ error: "Failed to read process logs" });
    }
  });

  // SSE — live stream
  fastify.get("/tenant/:id/process-logs/stream", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!id || id.length > 50) return reply.code(400).send({ error: "Invalid tenant ID" });

    const allowed = await requireTenantAccess(request, reply, id);
    if (!allowed) return;

    if (!checkSseRateLimit(id)) {
      return reply.code(429).send("Too many SSE connections. Please wait before reconnecting.");
    }

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    const write = (payload: unknown) => {
      const data = typeof payload === "string" ? payload : JSON.stringify(payload);
      reply.raw.write(`data: ${data}\n\n`);
    };

    let closed = false;
    const onClose = () => { closed = true; };
    reply.raw.on("close", onClose);

    write({ type: "connected", timestamp: new Date().toISOString() });

    // --- Initial batch: merge Redis + sync_jobs, sorted, send up to 200 ---
    let listCursor = 0;
    // Track which syncId:status combos have been sent to detect changes on poll
    const sentSyncJobKeys = new Set<string>();

    try {
      const [redisLen, dbEntries] = await Promise.all([
        getListLen(),
        fetchSyncJobEntries(id),
      ]);

      const startIdx = Math.max(0, redisLen - 200);
      const redisEntries = await fetchRedisEntries(id, { limit: 200, startIndex: startIdx });
      listCursor = redisLen;

      const merged = mergeEntries(redisEntries, dbEntries, 200);
      for (const entry of merged) {
        if (closed) break;
        write(entry);
      }

      // Record which sync_job states we already sent
      for (const entry of dbEntries) {
        const key = `${String(entry.meta?.syncId ?? "")}:${String(entry.meta?.status ?? "")}`;
        sentSyncJobKeys.add(key);
      }
    } catch {
      if (!closed) write({ type: "error", message: "Failed to read initial logs", timestamp: new Date().toISOString() });
    }

    // --- Poll: new Redis entries + sync_job state changes every 2s ---
    let heartbeatTick = 0;
    const intervalId = setInterval(async () => {
      if (closed) {
        clearInterval(intervalId);
        return;
      }
      try {
        // Redis: emit new entries since cursor
        const redis = getReadRedis();
        const newLen = await redis.llen(PROCESS_LOGS_KEY);
        if (newLen > listCursor) {
          const raw = await redis.lrange(PROCESS_LOGS_KEY, listCursor, -1);
          listCursor = newLen;
          for (const r of raw) {
            if (closed) break;
            const entry = parseEntry(r);
            if (!entry || !entryMatchesTenant(entry, id)) continue;
            write(entry);
          }
        } else if (newLen < listCursor) {
          listCursor = newLen;
        }

        // sync_jobs: emit new / status-changed entries
        const latestDbEntries = await fetchSyncJobEntries(id);
        for (const entry of latestDbEntries) {
          if (closed) break;
          const key = `${String(entry.meta?.syncId ?? "")}:${String(entry.meta?.status ?? "")}`;
          if (!sentSyncJobKeys.has(key)) {
            sentSyncJobKeys.add(key);
            write(entry);
          }
        }

        // Heartbeat every ~10 seconds
        heartbeatTick++;
        if (heartbeatTick % 5 === 0 && !closed) {
          reply.raw.write(": heartbeat\n\n");
        }
      } catch {
        if (!closed) {
          write({ type: "error", message: "Stream polling error", timestamp: new Date().toISOString() });
        }
      }
    }, 2000);

    return reply;
  });
};

export default processLogsRoute;
