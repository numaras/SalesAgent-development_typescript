import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { requireTenantAccess } from "../../services/authGuard.js";

function parseCreativeSpec(url: string): Record<string, unknown> {
  // Placeholder parity behavior while AI parser migration is pending.
  return {
    success: false,
    error: "Creative format parsing not yet implemented",
    url,
  };
}

const analyzeCreativeRoute: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  fastify.post("/tenant/:id/creatives/analyze", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    request.auditOperation = "analyze";

    const body = (request.body ?? {}) as Record<string, unknown>;
    const url = typeof body.url === "string" ? body.url.trim() : "";
    if (!url) {
      return reply.code(400).send({ error: "URL is required" });
    }

    try {
      const result = parseCreativeSpec(url);
      if (typeof result.error === "string" && result.error) {
        return reply.code(400).send({ error: result.error });
      }
      return reply.send(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return reply.code(500).send({ error: message });
    }
  });
};

export default analyzeCreativeRoute;
