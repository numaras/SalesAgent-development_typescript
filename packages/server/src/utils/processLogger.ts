/**
 * Cross-process structured logger backed by a Redis ring buffer.
 *
 * Both the HTTP server and the separate adcp-worker process import this module.
 * Each call:
 *   1. Prints to stdout/stderr (always, so PM2 log files stay populated).
 *   2. RPUSHes a JSON entry to `process_logs` in Redis and LTRIMs to 2000.
 *
 * Falls back silently to console-only if Redis is unavailable.
 */
import { Redis } from "ioredis";
import { redisConnectionOptions } from "../jobs/queues.js";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface ProcessLogEntry {
  ts: string;
  level: LogLevel;
  process: string;
  tenantId?: string;
  message: string;
  meta?: Record<string, unknown>;
}

export const PROCESS_LOGS_KEY = "process_logs";
export const MAX_LOG_ENTRIES = 2000;

let _redis: Redis | null = null;
let _redisInitFailed = false;

function getRedis(): Redis | null {
  if (_redisInitFailed) return null;
  if (_redis?.status === "ready" || _redis?.status === "connecting") return _redis;
  try {
    _redis = new Redis({
      ...redisConnectionOptions(),
      // Keep the offline queue so startup messages issued before the TCP
      // handshake completes are buffered and flushed once Redis is ready,
      // rather than being silently dropped.
      enableOfflineQueue: true,
      lazyConnect: false,
    });
    _redis.on("error", () => {
      // Suppress noise — writer will just skip Redis on failure
    });
    return _redis;
  } catch {
    _redisInitFailed = true;
    return null;
  }
}

async function writeLog(entry: ProcessLogEntry): Promise<void> {
  // Always mirror to console so PM2 log files stay intact
  const label = `[${entry.process}] [${entry.level.toUpperCase()}]${entry.tenantId ? ` [${entry.tenantId}]` : ""}`;
  const line = `${label} ${entry.message}`;
  if (entry.level === "error") {
    console.error(line, entry.meta ?? "");
  } else if (entry.level === "warn") {
    console.warn(line, entry.meta ?? "");
  } else {
    console.log(line, entry.meta ?? "");
  }

  // Push to Redis ring buffer (best-effort)
  const redis = getRedis();
  if (!redis) return;
  try {
    const serialised = JSON.stringify(entry);
    await redis.rpush(PROCESS_LOGS_KEY, serialised);
    await redis.ltrim(PROCESS_LOGS_KEY, -MAX_LOG_ENTRIES, -1);
  } catch {
    // Redis write failure — already logged to console above
  }
}

export type ProcessLogger = ReturnType<typeof createProcessLogger>;

function createProcessLogger(processName: string) {
  return {
    debug(message: string, meta?: Record<string, unknown> & { tenantId?: string }): void {
      const { tenantId, ...rest } = meta ?? {};
      void writeLog({ ts: new Date().toISOString(), level: "debug", process: processName, tenantId, message, meta: Object.keys(rest).length ? rest : undefined });
    },
    info(message: string, meta?: Record<string, unknown> & { tenantId?: string }): void {
      const { tenantId, ...rest } = meta ?? {};
      void writeLog({ ts: new Date().toISOString(), level: "info", process: processName, tenantId, message, meta: Object.keys(rest).length ? rest : undefined });
    },
    warn(message: string, meta?: Record<string, unknown> & { tenantId?: string }): void {
      const { tenantId, ...rest } = meta ?? {};
      void writeLog({ ts: new Date().toISOString(), level: "warn", process: processName, tenantId, message, meta: Object.keys(rest).length ? rest : undefined });
    },
    error(message: string, meta?: Record<string, unknown> & { tenantId?: string }): void {
      const { tenantId, ...rest } = meta ?? {};
      void writeLog({ ts: new Date().toISOString(), level: "error", process: processName, tenantId, message, meta: Object.keys(rest).length ? rest : undefined });
    },
  };
}

/** Returns a logger bound to the given process name. Call once per module. */
export function getProcessLogger(processName: string): ProcessLogger {
  return createProcessLogger(processName);
}
