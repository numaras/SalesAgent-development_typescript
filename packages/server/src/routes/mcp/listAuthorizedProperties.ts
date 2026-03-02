/**
 * POST /mcp/list-authorized-properties — AdCP list-authorized-properties (tenant required, auth optional).
 *
 * Legacy equivalent: _legacy/src/core/tools/properties.py → list_authorized_properties()
 *
 * Resolves tenant from headers. Auth is optional (discovery endpoint).
 * Returns publisher domains this agent is authorized to represent.
 *
 * Register with prefix: await app.register(listAuthorizedPropertiesRoute, { prefix: '/mcp' })
 */
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { resolveTenantFromHeaders } from "../../auth/resolveTenantFromHost.js";
import { ListAuthorizedPropertiesRequestSchema } from "../../schemas/authorizedProperties.js";
import { listAuthorizedPropertiesRouteSchema } from "../schemas/mcp/listAuthorizedProperties.schema.js";
import { listAuthorizedProperties } from "../../services/propertiesService.js";

const listAuthorizedPropertiesRoute: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  fastify.post(
    "/list-authorized-properties",
    {
      schema: listAuthorizedPropertiesRouteSchema,
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

      const body = (request.body as Record<string, unknown>) ?? {};
      const parsed = ListAuthorizedPropertiesRequestSchema.parse(body);

      const response = await listAuthorizedProperties(
        { tenantId: tenant.tenantId },
        parsed,
      );

      return reply.send(response);
    },
  );
};

export default listAuthorizedPropertiesRoute;
