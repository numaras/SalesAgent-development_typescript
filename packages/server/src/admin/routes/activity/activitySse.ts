import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { requireTenantAccess } from "../../services/authGuard.js";
import { getRecentActivities } from "./activityRest.js";

const MAX_CONNECTIONS_PER_TENANT = 10;
const POLL_INTERVAL_MS = 2000;
const RATE_LIMIT_WINDOW_MS = 60_000;

/**
 * Tracks connection attempt timestamps per tenant for sliding-window rate limiting.
 * Mirrors Python activity_stream.py `connection_timestamps` dict with 60s rolling
 * window cleanup before comparing count.
 */
const connectionTimestamps = new Map<string, number[]>();

function sseDataLine(payload: unknown): string {
  const data = typeof payload === "string" ? payload : JSON.stringify(payload);
  return `data: ${data}\n\n`;
}

function sseErrorLine(payload: unknown): string {
  const data = typeof payload === "string" ? payload : JSON.stringify(payload);
  return `event: error\ndata: ${data}\n\n`;
}

const activitySseRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.head("/tenant/:id/events", async (_request, reply) => {
    return reply.code(200).send();
  });

  fastify.get("/tenant/:id/events", async (request, reply) => {
    const { id } = request.params as { id: string };

    if (!id || id.length > 50) {
      return reply.code(400).send({ error: "Invalid tenant ID" });
    }

    const allowed = await requireTenantAccess(request, reply, id);
    if (!allowed) return;

    const now = Date.now();
    const recentTimestamps = (connectionTimestamps.get(id) ?? []).filter(
      (t) => now - t < RATE_LIMIT_WINDOW_MS,
    );
    if (recentTimestamps.length >= MAX_CONNECTIONS_PER_TENANT) {
      return reply.code(429).send("Too many connections. Please wait before reconnecting.");
    }
    recentTimestamps.push(now);
    connectionTimestamps.set(id, recentTimestamps);

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });
    reply.raw.write(sseDataLine({ type: "connected", timestamp: new Date().toISOString() }));

    let lastCheck = new Date();
    let closed = false;

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const onClose = () => {
      closed = true;
      if (intervalId) clearInterval(intervalId);
    };

    reply.raw.on("close", onClose);

    try {
      const initial = await getRecentActivities(id, { limit: 50 });
      const oldestFirst = [...initial].reverse();
      for (const activity of oldestFirst) {
        if (closed) break;
        reply.raw.write(sseDataLine(activity));
      }
    } catch {
      if (!closed) {
        reply.raw.write(
          sseErrorLine({ type: "error", message: "Failed to start activity stream", timestamp: new Date().toISOString() }),
        );
      }
    }

    intervalId = setInterval(async () => {
      if (closed) return;
      try {
        const since = new Date(lastCheck.getTime() - 1000);
        const newActivities = await getRecentActivities(id, { since, limit: 10 });
        const oldestFirst = [...newActivities].reverse();
        for (const activity of oldestFirst) {
          if (closed) break;
          reply.raw.write(sseDataLine(activity));
        }
        if (newActivities.length > 0 && newActivities[0]?.timestamp) {
          const ts = new Date(String(newActivities[0].timestamp));
          if (ts.getTime() > lastCheck.getTime()) lastCheck = ts;
        } else {
          lastCheck = new Date();
        }
        if (!closed) reply.raw.write(": heartbeat\n\n");
      } catch {
        if (!closed) {
          reply.raw.write(
            sseErrorLine({ type: "error", message: "Stream error occurred", timestamp: new Date().toISOString() }),
          );
          // 5-second back-off after error before next normal poll cycle
          if (intervalId) clearInterval(intervalId);
          setTimeout(() => {
            if (!closed) {
              intervalId = setInterval(async () => {
                if (closed) return;
                try {
                  const since = new Date(lastCheck.getTime() - 1000);
                  const newActivities = await getRecentActivities(id, { since, limit: 10 });
                  const oldestFirst = [...newActivities].reverse();
                  for (const activity of oldestFirst) {
                    if (closed) break;
                    reply.raw.write(sseDataLine(activity));
                  }
                  if (newActivities.length > 0 && newActivities[0]?.timestamp) {
                    const ts = new Date(String(newActivities[0].timestamp));
                    if (ts.getTime() > lastCheck.getTime()) lastCheck = ts;
                  } else {
                    lastCheck = new Date();
                  }
                  if (!closed) reply.raw.write(": heartbeat\n\n");
                } catch {
                  if (!closed) {
                    reply.raw.write(
                      sseErrorLine({ type: "error", message: "Stream error occurred", timestamp: new Date().toISOString() }),
                    );
                  }
                }
              }, POLL_INTERVAL_MS);
            }
          }, 5000);
        }
      }
    }, POLL_INTERVAL_MS);

    return reply;
  });
};

export default activitySseRoute;
