import {
  UpdatePerformanceIndexRequestSchema,
  UpdatePerformanceIndexResponseSchema,
} from "../../../schemas/performanceIndex.js";
import { McpErrorResponseSchema } from "./_common.schema.js";

export const updatePerformanceIndexRouteSchema = {
  description:
    "Update performance index for a media buy (AdCP update-performance-index). Auth required.",
  tags: ["mcp", "media-buy", "performance"],
  body: UpdatePerformanceIndexRequestSchema,
  response: {
    200: UpdatePerformanceIndexResponseSchema,
    400: McpErrorResponseSchema,
    401: McpErrorResponseSchema,
  },
} as const;
