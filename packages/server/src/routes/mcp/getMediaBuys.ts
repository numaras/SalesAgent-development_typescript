/**
 * POST /mcp/get-media-buys — AdCP get-media-buys (auth required).
 *
 * Legacy equivalent: _legacy/src/core/tools/media_buy_list.py — MCP wrapper.
 *
 * Resolves tenant from headers; requires auth. Returns paginated list of media buys
 * owned by the principal, with optional filters by ids, buyer_refs, and status.
 *
 * Register with prefix: await app.register(getMediaBuysRoute, { prefix: '/mcp' })
 */
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { resolveTenantFromHeaders } from "../../auth/resolveTenantFromHost.js";
import { GetMediaBuysRequestSchema } from "../../schemas/mediaBuyList.js";
import { getMediaBuysRouteSchema } from "../schemas/mcp/getMediaBuys.schema.js";
import { listMediaBuys } from "../../services/mediaBuyListService.js";

const getMediaBuysRoute: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  fastify.post(
    "/get-media-buys",
    {
      schema: getMediaBuysRouteSchema,
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
            "Missing x-adcp-auth header. Authentication is required for get-media-buys.",
        });
      }

      const body = (request.body as Record<string, unknown> | undefined) ?? {};
      const parsed = GetMediaBuysRequestSchema.parse(body);

      const response = await listMediaBuys(
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

export default getMediaBuysRoute;
