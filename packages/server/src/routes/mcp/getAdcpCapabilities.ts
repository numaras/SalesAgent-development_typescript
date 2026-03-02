/**
 * GET /mcp/get-adcp-capabilities — AdCP v3 capabilities (optional auth).
 *
 * Legacy equivalent: _legacy/src/core/main.py → get_adcp_capabilities (MCP tool)
 *   Returns minimal capabilities when no tenant; full media_buy when tenant context.
 *   Auth is optional; when request.auth is set, uses tenantId for full response.
 *
 * Register with prefix: await app.register(getAdcpCapabilitiesRoute, { prefix: '/mcp' })
 */
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { resolveTenantFromHeaders } from "../../auth/resolveTenantFromHost.js";
import { getAdcpCapabilitiesRouteSchema } from "../schemas/mcp/getAdcpCapabilities.schema.js";
import { getAdcpCapabilities } from "../../services/capabilitiesService.js";

const getAdcpCapabilitiesRoute: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  fastify.get(
    "/get-adcp-capabilities",
    {
      schema: getAdcpCapabilitiesRouteSchema,
    },
    async (request, reply) => {
      const tenant = await resolveTenantFromHeaders(
        request.headers as Record<string, string | string[] | undefined>,
      );
      const tenantContext = tenant
        ? { tenantId: tenant.tenantId, tenantName: tenant.name }
        : null;
      const response = await getAdcpCapabilities(tenantContext);
      return reply.send(response);
    },
  );
};

export default getAdcpCapabilitiesRoute;
