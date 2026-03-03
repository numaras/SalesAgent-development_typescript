import type { FastifyInstance, FastifyPluginAsync } from "fastify";

const adminRootRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/admin/", async (_request, reply) => {
    return reply.send({
      legacy_route: true,
      redirect_to: "/auth/select-tenant",
      message: "Admin root moved to tenant selection.",
    });
  });
};

export default adminRootRoute;
