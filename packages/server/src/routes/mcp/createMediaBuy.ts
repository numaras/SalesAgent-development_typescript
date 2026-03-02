/**
 * POST /mcp/create-media-buy — AdCP create-media-buy (auth required).
 *
 * Legacy equivalent: _legacy/src/core/tools/media_buy_create.py → create_media_buy_raw()
 *
 * Resolves tenant from headers; requires auth. Chains mediaBuyCreateService (D→E→F);
 * strips internal fields (workflow_step_id, etc.) before response.
 *
 * Register with prefix: await app.register(createMediaBuyRoute, { prefix: '/mcp' })
 */
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { resolveTenantFromHeaders } from "../../auth/resolveTenantFromHost.js";
import { CreateMediaBuyRequestSchema } from "../../schemas/mediaBuyCreate.js";
import { createMediaBuyRouteSchema } from "../schemas/mcp/createMediaBuy.schema.js";
import { createMediaBuy } from "../../services/mediaBuyCreateService.js";
import { stripInternalFields } from "../../services/internalFieldStripper.js";

const createMediaBuyRoute: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  fastify.post(
    "/create-media-buy",
    {
      schema: createMediaBuyRouteSchema,
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
            "Missing x-adcp-auth header. Authentication is required for create-media-buy.",
        });
      }

      const body = request.body as Record<string, unknown>;
      const parsed = CreateMediaBuyRequestSchema.parse(body);

      const response = await createMediaBuy(
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

export default createMediaBuyRoute;
