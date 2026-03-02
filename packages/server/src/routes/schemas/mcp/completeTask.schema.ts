import {
  CompleteTaskRequestSchema,
  CompleteTaskResponseSchema,
} from "../../../schemas/workflowTask.js";
import { McpErrorResponseSchema } from "./_common.schema.js";

export const completeTaskRouteSchema = {
  description:
    "Complete or fail a workflow task (AdCP complete_task). Auth required.",
  tags: ["mcp", "tasks", "workflow"],
  body: CompleteTaskRequestSchema,
  response: {
    200: CompleteTaskResponseSchema,
    400: McpErrorResponseSchema,
    401: McpErrorResponseSchema,
    404: McpErrorResponseSchema,
  },
} as const;