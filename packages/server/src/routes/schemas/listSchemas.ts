/**
 * GET /schemas/adcp/v2.4/ and GET /schemas/adcp/v2.4/index.json — list available AdCP schemas.
 *
 * Legacy equivalent: _legacy/src/admin/blueprints/schemas.py → list_schemas()
 *   Returns index with schema names and URLs.
 *
 * Register with prefix: await app.register(listSchemasRoute, { prefix: '/schemas' })
 */
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import {
  createSchemaRegistry,
  listSchemaNames,
} from "../../services/schemaRegistryService.js";
import {
  listSchemasIndexJsonRouteSchema,
  listSchemasRouteSchema,
} from "./listSchemas.schema.js";

const listSchemasRoute: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  const handler = async (
    request: { protocol: string; hostname: string },
    reply: { send: (payload: unknown) => unknown },
  ) => {
    const baseUrl =
      request.protocol && request.hostname
        ? `${request.protocol}://${request.hostname}/schemas/adcp/v2.4`
        : "";
    const registry = createSchemaRegistry(baseUrl);
    const names = listSchemaNames(registry);

    const index = {
      schemas: {} as Record<string, { url: string; description: string }>,
      version: "AdCP v2.4",
      schema_version: "draft-2020-12",
      base_url: baseUrl,
      description:
        "JSON Schemas for AdCP v2.4 API response validation",
    };

    for (const name of names) {
      index.schemas[name] = {
        url: `${baseUrl}/${name}.json`,
        description: `Schema for ${name} responses`,
      };
    }

    return reply.send(index);
  };

  fastify.get(
    "/adcp/v2.4/",
    {
      schema: listSchemasRouteSchema,
    },
    (req, reply) => handler(req, reply),
  );

  fastify.get(
    "/adcp/v2.4/index.json",
    {
      schema: listSchemasIndexJsonRouteSchema,
    },
    (req, reply) => handler(req, reply),
  );
};

export default listSchemasRoute;
