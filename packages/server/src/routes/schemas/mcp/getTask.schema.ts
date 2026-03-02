import { z } from "zod";

import { GetTaskResponseSchema } from "../../../schemas/workflowTask.js";
import { McpErrorResponseSchema } from "./_common.schema.js";

export const getTaskRouteSchema = {
  description:
    "Get workflow task detail by task_id (AdCP get_task). Auth required.",
  tags: ["mcp", "tasks", "workflow"],
  body: z
    .object({
      task_id: z.string().optional(),
    })
    .optional()
    .default({}),
  response: {
    200: GetTaskResponseSchema,
    400: McpErrorResponseSchema,
    401: McpErrorResponseSchema,
    404: McpErrorResponseSchema,
  },
} as const;
