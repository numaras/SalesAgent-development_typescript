import {
  ListTasksRequestSchema,
  ListTasksResponseSchema,
} from "../../../schemas/workflowTask.js";
import { McpErrorResponseSchema } from "./_common.schema.js";

export const listTasksRouteSchema = {
  description:
    "List workflow tasks with filters and pagination (AdCP list_tasks). Auth required.",
  tags: ["mcp", "tasks", "workflow"],
  body: ListTasksRequestSchema.optional(),
  response: {
    200: ListTasksResponseSchema,
    400: McpErrorResponseSchema,
    401: McpErrorResponseSchema,
  },
} as const;
