/**
 * POST /mcp/update-performance-index — AdCP update-performance-index (auth required).
 *
 * Legacy equivalent: _legacy/src/core/tools/performance.py — MCP wrapper.
 *
 * Resolves tenant from headers; requires auth. Updates performance index data for a media buy.
 *
 * Register with prefix: await app.register(updatePerformanceIndexRoute, { prefix: '/mcp' })
 */
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { resolveTenantFromHeaders } from "../../auth/resolveTenantFromHost.js";
import { UpdatePerformanceIndexRequestSchema } from "../../schemas/performanceIndex.js";
import { updatePerformanceIndexRouteSchema } from "../schemas/mcp/updatePerformanceIndex.schema.js";
import { updatePerformanceIndex } from "../../services/performanceIndexService.js";

const updatePerformanceIndexRoute: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  fastify.post(
    "/update-performance-index",
    {
      schema: updatePerformanceIndexRouteSchema,
    },
    async (request, reply) => {
      const headers = request.headers as Record<
        string,
        string | string[] | undefined
      >;
      const tenant = await resolveTenantFromHeaders(headers);
      if (!tenant) {
        return reply.code(400).send({
          error: "NO_TENANT",
          message:
            "Cannot determine tenant. Set Host, x-adcp-tenant, or use a known tenant host.",
        });
      }

      if (!request.auth) {
        return reply.code(401).send({
          error: "UNAUTHORIZED",
          message:
            "Missing x-adcp-auth header. Authentication is required for update-performance-index.",
        });
      }

      const body = (request.body as Record<string, unknown>) ?? {};
      const parsed = UpdatePerformanceIndexRequestSchema.parse(body);

      const response = await updatePerformanceIndex(
        {
          tenantId: tenant.tenantId,
          principalId: request.auth.principalId,
        },
        parsed,
      );

      return reply.send(response);
    },
  );
};

export default updatePerformanceIndexRoute;
