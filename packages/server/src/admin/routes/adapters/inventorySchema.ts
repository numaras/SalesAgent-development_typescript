import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { inventorySchemaRouteSchema } from "../../../routes/schemas/admin/adapters/inventorySchema.schema.js";
import { requireTenantAccess } from "../../services/authGuard.js";

const inventorySchemaRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/tenant/:id/adapter/:name/inventory_schema", { schema: inventorySchemaRouteSchema }, async (request, reply) => {
    const { id, name } = request.params as { id: string; name: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    return reply.code(501).send({
      error: "Not yet implemented",
      adapter_name: name,
      message: "Inventory schema endpoint is not yet implemented for this adapter.",
    });
  });
};

export default inventorySchemaRoute;
