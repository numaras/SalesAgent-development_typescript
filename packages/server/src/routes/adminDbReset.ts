/**
 * POST /admin/reset-db-pool — reset DB pool (testing only).
 *
 * Legacy equivalent: _legacy/src/core/main.py → reset_db_pool()
 *   Only available when ADCP_TESTING=true. Flushes the connection pool and
 *   clears tenant context so the next request sees fresh data (e.g. after
 *   E2E test data setup).
 */
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { adminDbResetRouteSchema } from "./schemas/system/adminDbReset.schema.js";
import {
  ADMIN_DB_RESET_FORBIDDEN_MESSAGE,
  ADMIN_DB_RESET_SUCCESS_MESSAGE,
  isTestingModeEnabled,
  resetDatabasePool,
} from "../services/adminDbResetRouteService.js";

const adminDbResetRoute: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  fastify.post(
    "/admin/reset-db-pool",
    {
      schema: adminDbResetRouteSchema,
    },
    async (_request, reply) => {
      if (!isTestingModeEnabled()) {
        return reply.status(403).send({ error: ADMIN_DB_RESET_FORBIDDEN_MESSAGE });
      }

      try {
        await resetDatabasePool();
        return reply.status(200).send({
          status: "success",
          message: ADMIN_DB_RESET_SUCCESS_MESSAGE,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return reply.status(500).send({ error: `Failed to reset: ${message}` });
      }
    },
  );
};

export default adminDbResetRoute;
