/**
 * Schemas routes root: register getSchema, listSchemas, root, adcp versions, health.
 *
 * Legacy equivalent: _legacy/src/admin/blueprints/schemas.py (Blueprint with all routes).
 *
 * Register with prefix: await app.register(schemasRootRoute, { prefix: '/schemas' })
 * Routes: GET /schemas/, GET /schemas/adcp/, GET /schemas/health,
 *         GET /schemas/adcp/v2.4/:schemaName, GET /schemas/adcp/v2.4/, GET /schemas/adcp/v2.4/index.json
 */
import type {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyRequest,
} from "fastify";

import getSchemaRoute from "./getSchema.js";
import listSchemasRoute from "./listSchemas.js";
import {
  schemasAdcpVersionsRouteSchema,
  schemasHealthRouteSchema,
  schemasRootRouteSchema,
} from "./root.schema.js";
import {
  buildSchemasRootPayload,
  buildSchemasVersionsPayload,
  getSchemasHealthPayload,
} from "../../services/schemasRouteService.js";

const schemasRootRoute: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  type SchemasRequest = FastifyRequest;

  await fastify.register(getSchemaRoute);
  await fastify.register(listSchemasRoute);

  fastify.get(
    "/",
    {
      schema: schemasRootRouteSchema,
    },
    async (request: SchemasRequest, reply) => {
      const payload = buildSchemasRootPayload(
        request.protocol,
        request.hostname,
      );
      return reply.send(payload);
    },
  );

  fastify.get(
    "/adcp/",
    {
      schema: schemasAdcpVersionsRouteSchema,
    },
    async (request: SchemasRequest, reply) => {
      const payload = buildSchemasVersionsPayload(
        request.protocol,
        request.hostname,
      );
      return reply.send(payload);
    },
  );

  fastify.get(
    "/health",
    {
      schema: schemasHealthRouteSchema,
    },
    async (_request: SchemasRequest, reply) => {
      try {
        return reply.send(getSchemasHealthPayload());
      } catch (err) {
        return reply.code(500).send({
          status: "unhealthy",
          error: err instanceof Error ? err.message : String(err),
          service: "AdCP Schema Validation Service",
        });
      }
    },
  );
};

export default schemasRootRoute;
