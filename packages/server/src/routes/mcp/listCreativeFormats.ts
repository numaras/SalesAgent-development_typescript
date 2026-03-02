/**
 * POST /mcp/list-creative-formats — AdCP list-creative-formats (optional auth).
 *
 * Legacy equivalent: _legacy/src/core/tools/creative_formats.py → list_creative_formats()
 *
 * Resolves tenant from headers; returns formats from formatService. Auth optional.
 *
 * Register with prefix: await app.register(listCreativeFormatsRoute, { prefix: '/mcp' })
 */
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { resolveTenantFromHeaders } from "../../auth/resolveTenantFromHost.js";
import { ListCreativeFormatsRequestSchema } from "../../schemas/creativeFormats.js";
import { listCreativeFormatsRouteSchema } from "../schemas/mcp/listCreativeFormats.schema.js";
import { listFormats } from "../../services/formatService.js";

const listCreativeFormatsRoute: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  fastify.post(
    "/list-creative-formats",
    {
      schema: listCreativeFormatsRouteSchema,
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

      const body = request.body as Record<string, unknown> | undefined;
      const parsed = body
        ? ListCreativeFormatsRequestSchema.parse(body)
        : ListCreativeFormatsRequestSchema.parse({});

      const response = await listFormats(
        { tenantId: tenant.tenantId },
        parsed,
      );
      return reply.send(response);
    },
  );
};

export default listCreativeFormatsRoute;
