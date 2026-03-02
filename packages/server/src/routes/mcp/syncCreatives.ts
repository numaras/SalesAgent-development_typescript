/**
 * POST /mcp/sync-creatives — AdCP sync-creatives (auth required).
 *
 * Legacy equivalent: _legacy/src/core/tools/creatives/sync_wrappers.py → sync_creatives()
 *
 * Resolves tenant from headers; requires auth. Syncs creative assets (create/update).
 *
 * Register with prefix: await app.register(syncCreativesRoute, { prefix: '/mcp' })
 */
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { resolveTenantFromHeaders } from "../../auth/resolveTenantFromHost.js";
import { SyncCreativesRequestSchema } from "../../schemas/syncCreatives.js";
import { syncCreativesRouteSchema } from "../schemas/mcp/syncCreatives.schema.js";
import { syncCreatives } from "../../services/creativeSyncService.js";

const syncCreativesRoute: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  fastify.post(
    "/sync-creatives",
    {
      schema: syncCreativesRouteSchema,
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
            "Missing x-adcp-auth header. Authentication is required for sync-creatives.",
        });
      }

      const body = request.body as Record<string, unknown>;
      const parsed = SyncCreativesRequestSchema.parse(body);

      const response = await syncCreatives(
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

export default syncCreativesRoute;
