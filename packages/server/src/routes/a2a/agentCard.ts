/**
 * GET /.well-known/agent-card.json, GET /.well-known/agent.json, and GET /agent.json — A2A discovery.
 *
 * Legacy equivalent: _legacy/src/a2a_server/adcp_a2a_server.py
 *   — dynamic agent card endpoints with tenant-specific URL and Apx-Incoming-Host priority.
 */
import type {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import {
  alternateAgentCardRouteSchema,
  legacyAgentCardRouteSchema,
  primaryAgentCardRouteSchema,
} from "../schemas/a2a/agentCard.schema.js";
import {
  buildAgentCard,
  buildBaseUrl,
} from "../../services/agentCardRouteService.js";

const agentCardRoute: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  type AgentCardRequest = FastifyRequest<{
    Headers: Record<string, string | string[] | undefined>;
  }>;

  async function agentCardHandler(
    request: AgentCardRequest,
    reply: FastifyReply,
  ) {
    const baseUrl = buildBaseUrl(request.headers);
    const card = buildAgentCard(baseUrl);
    return reply.send(card);
  }

  fastify.get(
    "/.well-known/agent-card.json",
    { schema: primaryAgentCardRouteSchema },
    agentCardHandler,
  );

  fastify.get(
    "/.well-known/agent.json",
    { schema: legacyAgentCardRouteSchema },
    agentCardHandler,
  );

  fastify.get(
    "/agent.json",
    { schema: alternateAgentCardRouteSchema },
    agentCardHandler,
  );
};

export default agentCardRoute;
