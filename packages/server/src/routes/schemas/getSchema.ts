/**
 * GET /schemas/adcp/v2.4/:schemaName — return JSON Schema for an AdCP response type.
 *
 * Legacy equivalent: _legacy/src/admin/blueprints/schemas.py → get_schema(schema_name)
 *   Normalizes name (case-insensitive, underscore/hyphen agnostic); returns 404 with
 *   available_schemas when not found.
 *
 * Register with prefix: await app.register(getSchemaRoute, { prefix: '/schemas' })
 */
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import {
  createSchemaRegistry,
  getSchema as getSchemaFromRegistry,
  listSchemaNames,
} from "../../services/schemaRegistryService.js";
import { getSchemaRouteSchema } from "./getSchema.schema.js";

const getSchemaRoute: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  fastify.get<{
    Params: { schemaName: string };
  }>(
    "/adcp/v2.4/:schemaName",
    {
      schema: getSchemaRouteSchema,
    },
    async (request, reply) => {
      const rawName = request.params.schemaName.replace(/\.json$/i, "");
      const baseUrl =
        request.protocol && request.hostname
          ? `${request.protocol}://${request.hostname}`
          : "";
      const registry = createSchemaRegistry(baseUrl);
      const schema = getSchemaFromRegistry(registry, rawName);

      if (schema) {
        return reply.send(schema);
      }

      const available = listSchemaNames(registry);
      return reply.code(404).send({
        error: "Schema not found",
        requested_schema: request.params.schemaName,
        available_schemas: available,
        note: "Schema names are case-insensitive and support both underscore and hyphen separators",
      });
    },
  );
};

export default getSchemaRoute;
