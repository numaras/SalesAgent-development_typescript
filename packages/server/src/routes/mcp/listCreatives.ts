/**
 * POST /mcp/list-creatives — AdCP list-creatives (auth required).
 *
 * Legacy equivalent: _legacy/src/core/tools/creatives/listing.py → list_creatives()
 *
 * Resolves tenant from headers; requires auth. Returns creatives for the principal
 * with filters, sort, and pagination.
 *
 * Register with prefix: await app.register(listCreativesRoute, { prefix: '/mcp' })
 */
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { resolveTenantFromHeaders } from "../../auth/resolveTenantFromHost.js";
import {
  ListCreativesRequestSchema,
  ListCreativesResponseSchema,
} from "../../schemas/creative.js";
import { listCreativesRouteSchema } from "../schemas/mcp/listCreatives.schema.js";
import { buildPagination } from "../../services/creativePagination.js";
import { queryCreatives } from "../../services/creativeQueryService.js";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 1000;

const listCreativesRoute: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  fastify.post(
    "/list-creatives",
    {
      schema: listCreativesRouteSchema,
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
          message: "Missing x-adcp-auth header. Authentication is required for list-creatives.",
        });
      }

      const body = request.body as Record<string, unknown> | undefined;
      const parsed = body
        ? ListCreativesRequestSchema.parse(body)
        : ListCreativesRequestSchema.parse({});

      const pagination = parsed.pagination ?? {};
      const offset = Math.max(0, pagination.offset ?? 0);
      const limit = Math.min(
        MAX_LIMIT,
        Math.max(1, pagination.limit ?? DEFAULT_LIMIT),
      );

      const { creatives, totalCount } = await queryCreatives(
        {
          tenantId: tenant.tenantId,
          principalId: request.auth.principalId,
        },
        parsed,
      );

      const paginationObj = buildPagination(offset, limit, totalCount);
      const response = {
        creatives,
        pagination: paginationObj,
        query_summary: {
          returned: creatives.length,
          total_matching: totalCount,
        },
      };
      ListCreativesResponseSchema.parse(response);
      return reply.send(response);
    },
  );
};

export default listCreativesRoute;
