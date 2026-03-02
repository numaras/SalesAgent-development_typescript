/**
 * POST /mcp/get-media-buy-delivery — AdCP get-media-buy-delivery (auth required).
 *
 * Legacy equivalent: _legacy/src/core/tools/media_buy_delivery.py — MCP wrapper.
 *
 * Resolves tenant from headers; requires auth. Returns delivery data for media buys
 * matching media_buy_ids, buyer_refs, status_filter, and date range.
 *
 * Register with prefix: await app.register(getMediaBuyDeliveryRoute, { prefix: '/mcp' })
 */
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { resolveTenantFromHeaders } from "../../auth/resolveTenantFromHost.js";
import { GetMediaBuyDeliveryRequestSchema } from "../../schemas/mediaBuyDelivery.js";
import { getMediaBuyDeliveryRouteSchema } from "../schemas/mcp/getMediaBuyDelivery.schema.js";
import { getMediaBuyDelivery } from "../../services/deliveryQueryService.js";

const getMediaBuyDeliveryRoute: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  fastify.post(
    "/get-media-buy-delivery",
    {
      schema: getMediaBuyDeliveryRouteSchema,
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
            "Missing x-adcp-auth header. Authentication is required for get-media-buy-delivery.",
        });
      }

      const body = (request.body as Record<string, unknown>) ?? {};
      const parsed = GetMediaBuyDeliveryRequestSchema.parse(body);

      const response = await getMediaBuyDelivery(
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

export default getMediaBuyDeliveryRoute;
