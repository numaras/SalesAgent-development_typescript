/**
 * POST /mcp/update-media-buy — AdCP update-media-buy (auth required).
 *
 * Legacy equivalent: _legacy/src/core/tools/media_buy_update.py — route wrapper.
 *
 * Resolves tenant from headers; requires auth. Calls mediaBuyUpdateService;
 * strips internal fields (workflow_step_id, changes_applied) before response.
 *
 * Register with prefix: await app.register(updateMediaBuyRoute, { prefix: '/mcp' })
 */
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { resolveTenantFromHeaders } from "../../auth/resolveTenantFromHost.js";
import { UpdateMediaBuyRequestSchema } from "../../schemas/mediaBuyUpdate.js";
import { updateMediaBuyRouteSchema } from "../schemas/mcp/updateMediaBuy.schema.js";
import { stripInternalFields } from "../../services/internalFieldStripper.js";
import { updateMediaBuy } from "../../services/mediaBuyUpdateService.js";

const updateMediaBuyRoute: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  fastify.post(
    "/update-media-buy",
    {
      schema: updateMediaBuyRouteSchema,
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
            "Missing x-adcp-auth header. Authentication is required for update-media-buy.",
        });
      }

      const body = request.body as Record<string, unknown>;
      const parsed = UpdateMediaBuyRequestSchema.parse(body);

      const response = await updateMediaBuy(
        {
          tenantId: tenant.tenantId,
          principalId: request.auth.principalId,
        },
        parsed,
      );

      const stripped = stripInternalFields(response);
      return reply.send(stripped);
    },
  );
};

export default updateMediaBuyRoute;
