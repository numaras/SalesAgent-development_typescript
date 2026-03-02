/**
 * POST /mcp/get-task — AdCP get_task (auth required).
 *
 * Legacy equivalent: _legacy/src/core/main.py — @mcp.tool() get_task.
 *
 * Resolves tenant from headers; requires auth. Returns task detail by task_id.
 *
 * Register with prefix: await app.register(getTaskRoute, { prefix: '/mcp' })
 */
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { resolveTenantFromHeaders } from "../../auth/resolveTenantFromHost.js";
import { getTaskRouteSchema } from "../schemas/mcp/getTask.schema.js";
import {
  getTaskDetail,
  TaskNotFoundError,
} from "../../services/taskDetailService.js";

const getTaskRoute: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  fastify.post(
    "/get-task",
    {
      schema: getTaskRouteSchema,
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
            "Missing x-adcp-auth header. Authentication is required for get-task.",
        });
      }

      const body = (request.body as { task_id?: string }) ?? {};
      const taskId = typeof body.task_id === "string" ? body.task_id : "";
      if (!taskId.trim()) {
        return reply.code(400).send({
          error: "BAD_REQUEST",
          message: "task_id is required.",
        });
      }

      try {
        const response = await getTaskDetail(
          { contextId: undefined },
          taskId.trim(),
        );
        return reply.send(response);
      } catch (e) {
        if (e instanceof TaskNotFoundError) {
          return reply.code(404).send({
            error: "NOT_FOUND",
            message: e.message,
          });
        }
        throw e;
      }
    },
  );
};

export default getTaskRoute;
