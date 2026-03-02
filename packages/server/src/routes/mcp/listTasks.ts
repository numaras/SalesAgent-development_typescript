/**
 * POST /mcp/list-tasks — AdCP list_tasks (auth required).
 *
 * Legacy equivalent: _legacy/src/core/main.py — @mcp.tool() list_tasks.
 *
 * Resolves tenant from headers; requires auth. Returns workflow tasks with
 * optional filters (status, object_type, object_id) and pagination.
 *
 * Register with prefix: await app.register(listTasksRoute, { prefix: '/mcp' })
 */
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { resolveTenantFromHeaders } from "../../auth/resolveTenantFromHost.js";
import { ListTasksRequestSchema } from "../../schemas/workflowTask.js";
import { listTasksRouteSchema } from "../schemas/mcp/listTasks.schema.js";
import { listTasks } from "../../services/taskListService.js";

const listTasksRoute: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  fastify.post(
    "/list-tasks",
    {
      schema: listTasksRouteSchema,
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

      if (!request.auth) {
        return reply.code(401).send({
          error: "UNAUTHORIZED",
          message:
            "Missing x-adcp-auth header. Authentication is required for list-tasks.",
        });
      }

      const body = (request.body as Record<string, unknown> | undefined) ?? {};
      const parsed = ListTasksRequestSchema.parse(body);

      const response = await listTasks(
        { contextId: parsed.context_id },
        parsed,
      );

      return reply.send(response);
    },
  );
};

export default listTasksRoute;
