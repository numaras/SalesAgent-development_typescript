/**
 * BullMQ queue definitions.
 *
 * All queues share one lazy-initialised Redis connection.
 * Connection config is read from REDIS_URL (default: redis://localhost:6379).
 */
import type { RedisOptions } from "ioredis";
import { Queue } from "bullmq";

export interface GamSyncJobData {
  syncId: string;
  tenantId: string;
  /** "full" | "incremental" | "orders" */
  syncType: string;
}

// ---------------------------------------------------------------------------
// Redis connection
// ---------------------------------------------------------------------------

function parseRedisUrl(raw: string): RedisOptions {
  try {
    const url = new URL(raw);
    const opts: RedisOptions = {
      host: url.hostname || "localhost",
      port: url.port ? parseInt(url.port, 10) : 6379,
    };
    if (url.password) opts.password = url.password;
    if (url.username) opts.username = url.username;
    if (url.pathname && url.pathname.length > 1) {
      opts.db = parseInt(url.pathname.slice(1), 10) || 0;
    }
    if (url.protocol === "rediss:") {
      opts.tls = {};
    }
    return opts;
  } catch {
    return { host: "localhost", port: 6379 };
  }
}

export function redisConnectionOptions(): RedisOptions {
  return {
    ...parseRedisUrl(process.env.REDIS_URL ?? "redis://localhost:6379"),
    // Don't buffer commands when Redis is offline — fail fast instead of queuing.
    enableOfflineQueue: false,
    // BullMQ manages its own retries; cap ioredis reconnect attempts to avoid
    // filling the log with ECONNREFUSED noise when Redis isn't running.
    maxRetriesPerRequest: null,
    retryStrategy: (times: number) => Math.min(times * 1000, 30_000),
  };
}

// ---------------------------------------------------------------------------
// Queue instances (lazy singletons)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _gamSyncQueue: Queue<GamSyncJobData, any, string> | undefined;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getGamSyncQueue(): Queue<GamSyncJobData, any, string> {
  if (!_gamSyncQueue) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _gamSyncQueue = new Queue<GamSyncJobData, any, string>("gam-sync", {
      connection: redisConnectionOptions(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 10_000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 200 },
      },
    });
    // Suppress unhandled "error" events — BullMQ logs them internally.
    // Without this listener Node.js throws an uncaught exception on connection errors.
    _gamSyncQueue.on("error", (_err) => {
      // Redis connection errors are expected when Redis isn't running.
      // BullMQ will retry automatically; no need to log every attempt.
    });
  }
  return _gamSyncQueue;
}

/**
 * Enqueue a GAM sync job and return the BullMQ job ID.
 * The sync DB record must already exist (status = "pending") before calling this.
 */
export async function enqueueGamSync(data: GamSyncJobData): Promise<string> {
  const queue = getGamSyncQueue();
  const job = await queue.add("gam-sync", data, {
    jobId: data.syncId,
  });
  return job.id ?? data.syncId;
}
