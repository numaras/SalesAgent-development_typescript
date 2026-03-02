import {
  ListCreativeFormatsRequestSchema,
  ListCreativeFormatsResponseSchema,
} from "../../../schemas/creativeFormats.js";
import { McpErrorResponseSchema } from "./_common.schema.js";

export const listCreativeFormatsRouteSchema = {
  description: "List available creative formats (AdCP list-creative-formats).",
  tags: ["mcp", "formats"],
  body: ListCreativeFormatsRequestSchema.optional().default({}),
  response: {
    200: ListCreativeFormatsResponseSchema,
    400: McpErrorResponseSchema,
  },
} as const;
