/**
 * POST /a2a and POST /a2a/ — A2A JSON-RPC 2.0 endpoint.
 *
 * Legacy equivalent: _legacy/src/a2a_server/adcp_a2a_server.py — POST /a2a handling.
 * Parse JSON-RPC; extract auth (Bearer first, then x-adcp-auth); call dispatcher.
 */
import type {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyRequest,
} from "fastify";
import {
  a2aJsonRpcRouteSchema,
  a2aJsonRpcTrailingSlashRouteSchema,
} from "../schemas/a2a/jsonRpc.schema.js";
// Register A2A skills (side-effect)
import "../../a2a/skills/getProducts.js";
import "../../a2a/skills/getAdcpCapabilities.js";
import "../../a2a/skills/createMediaBuy.js";
import "../../a2a/skills/updateMediaBuy.js";
import "../../a2a/skills/bulkSkills.js";
import "../../a2a/skills/pushNotificationSkills.js";
import {
  buildMissingBodyJsonRpcResponse,
  extractAuthToken,
  handleJsonRpc,
} from "../../services/a2aJsonRpcRouteService.js";

type JsonRpcRequest = FastifyRequest<{
  Body: unknown;
  Headers: Record<string, string | string[] | undefined>;
}>;

const jsonRpcRoute: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  fastify.post(
    "/a2a",
    {
      schema: a2aJsonRpcRouteSchema,
    },
    async (request: JsonRpcRequest, reply) => {
      const authToken = extractAuthToken(request.headers);
      const body = request.body;
      if (body === undefined || body === null) {
        return reply.code(400).send(buildMissingBodyJsonRpcResponse());
      }
      const response = await handleJsonRpc(
        body,
        authToken,
        request.headers,
      );
      return reply.send(response);
    },
  );

  fastify.post(
    "/a2a/",
    {
      schema: a2aJsonRpcTrailingSlashRouteSchema,
    },
    async (request: JsonRpcRequest, reply) => {
      const authToken = extractAuthToken(request.headers);
      const body = request.body;
      if (body === undefined || body === null) {
        return reply.code(400).send(buildMissingBodyJsonRpcResponse());
      }
      const response = await handleJsonRpc(
        body,
        authToken,
        request.headers,
      );
      return reply.send(response);
    },
  );
};

export default jsonRpcRoute;
