import {
  ListCreativesRequestSchema,
  ListCreativesResponseSchema,
} from "../../../schemas/creative.js";
import { McpErrorResponseSchema } from "./_common.schema.js";

export const listCreativesRouteSchema = {
  description: "List creative assets (AdCP list-creatives). Auth required.",
  tags: ["mcp", "creatives"],
  body: ListCreativesRequestSchema.optional().default({}),
  response: {
    200: ListCreativesResponseSchema,
    400: McpErrorResponseSchema,
    401: McpErrorResponseSchema,
  },
} as const;
