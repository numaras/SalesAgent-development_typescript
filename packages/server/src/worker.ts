/**
 * BullMQ worker process entry point.
 *
 * Run as a separate PM2 process:
 *   pm2 start ecosystem.config.cjs --only adcp-worker
 *
 * This process is purely a job consumer — it does not start the HTTP server.
 * Registers all queue workers and blocks indefinitely.
 */
import { startGamSyncWorker } from "./jobs/workers/gamSyncWorker.js";
import { getProcessLogger } from "./utils/processLogger.js";

const log = getProcessLogger("adcp-worker");

log.info("Starting BullMQ workers…");

const gamSyncWorker = startGamSyncWorker();

gamSyncWorker.on("ready", () => {
  log.info("gam-sync worker ready");
});

gamSyncWorker.on("completed", (job) => {
  log.info(`gam-sync job ${job.id} completed`, { jobId: job.id });
});

gamSyncWorker.on("failed", (job, err) => {
  log.error(`gam-sync job ${job?.id ?? "?"} failed: ${err.message}`, {
    jobId: job?.id,
    error: err.message,
    stack: err.stack,
  });
});

gamSyncWorker.on("error", (err) => {
  log.error(`gam-sync worker error: ${err.message}`, { error: err.message, stack: err.stack });
});

// Graceful shutdown
async function shutdown(signal: string) {
  log.info(`${signal} received — closing workers`);
  await gamSyncWorker.close();
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

log.info("Workers running. Waiting for jobs…");
