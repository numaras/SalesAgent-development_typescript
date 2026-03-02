/**
 * POST /mcp/complete-task — AdCP complete_task (auth required).
 *
 * Legacy equivalent: _legacy/src/core/main.py — @mcp.tool() complete_task.
 *
 * Resolves tenant from headers; requires auth. Marks a task as completed or failed.
 *
 * Register with prefix: await app.register(completeTaskRoute, { prefix: '/mcp' })
 */
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { resolveTenantFromHeaders } from "../../auth/resolveTenantFromHost.js";
import { CompleteTaskRequestSchema } from "../../schemas/workflowTask.js";
import { completeTaskRouteSchema } from "../schemas/mcp/completeTask.schema.js";
import { TaskNotFoundError } from "../../services/taskDetailService.js";
import {
  completeTask,
  TaskAlreadyCompletedError,
} from "../../services/taskCompleteService.js";

const completeTaskRoute: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  fastify.post(
    "/complete-task",
    {
      schema: completeTaskRouteSchema,
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
            "Missing x-adcp-auth header. Authentication is required for complete-task.",
        });
      }

      const body = (request.body as Record<string, unknown>) ?? {};
      const parsed = CompleteTaskRequestSchema.parse(body);

      try {
        const response = await completeTask(
          {
            contextId: undefined,
            principalId: request.auth.principalId,
          },
          parsed,
        );
        return reply.send(response);
      } catch (err) {
        if (err instanceof TaskNotFoundError) {
          return reply.code(404).send({
            error: "NOT_FOUND",
            message: err.message,
          });
        }
        if (err instanceof TaskAlreadyCompletedError) {
          return reply.code(400).send({
            error: "BAD_REQUEST",
            message: err.message,
          });
        }
        throw err;
      }
    },
  );
};

export default completeTaskRoute;
