/**
 * GET /health/config — configuration health check.
 *
 * Legacy equivalent: _legacy/src/core/main.py → health_config()
 *   Success: 200 with {"status": "healthy", "service": "mcp", "component": "configuration", "message": "..."}
 *   Error: 500 with {"status": "unhealthy", "service": "mcp", "component": "configuration", "error": "..."}
 *
 * Calls validateStartupRequirements(); on failure returns 500 with error message.
 * This route does not require authentication.
 */
import type {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyRequest,
} from "fastify";

import {
  HealthConfigErrorSchema,
  HealthConfigSuccessSchema,
} from "../schemas/healthConfig.js";
import {
  checkStartupConfiguration,
  getHealthConfigErrorPayload,
  getHealthConfigSuccessPayload,
} from "../services/healthConfigRouteService.js";

const healthConfigRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  type HealthConfigRequest = FastifyRequest;

  fastify.get(
    "/health/config",
    {
      schema: {
        description:
          "Configuration health check — validates startup requirements.",
        tags: ["system"],
        response: {
          200: HealthConfigSuccessSchema,
          500: HealthConfigErrorSchema,
        },
      },
    },
    async (_request: HealthConfigRequest, reply) => {
      try {
        checkStartupConfiguration();
        return reply.status(200).send(getHealthConfigSuccessPayload());
      } catch (err) {
        return reply.status(500).send(getHealthConfigErrorPayload(err));
      }
    },
  );
};

export default healthConfigRoute;
