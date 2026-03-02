/**
 * GET /health — liveness probe.
 *
 * Legacy equivalent: _legacy/src/core/main.py → health()
 *   Returns `{"status": "healthy", "service": "mcp"}` with HTTP 200.
 *
 * This route intentionally bypasses auth — load-balancers and container
 * orchestrators (K8s, Fly.io, ECS) hit it without credentials.
 *
 * Registration:
 *   ```ts
 *   await app.register(healthRoute);
 *   ```
 */
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { HEALTH_RESPONSE, HealthResponseSchema } from "../schemas/health.js";

const healthRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get(
    "/health",
    {
      schema: {
        description: "Liveness probe — returns 200 when the server is running.",
        tags: ["system"],
        response: {
          200: HealthResponseSchema,
        },
      },
    },
    async (_request, _reply) => {
      return HEALTH_RESPONSE;
    },
  );
};

export default healthRoute;
