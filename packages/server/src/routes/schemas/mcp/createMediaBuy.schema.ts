import { CreateMediaBuyRequestSchema } from "../../../schemas/mediaBuyCreate.js";
import { CreateMediaBuyResponseSchema } from "../../../schemas/mediaBuyCreateResponse.js";
import { McpErrorResponseSchema } from "./_common.schema.js";

export const createMediaBuyRouteSchema = {
  description: "Create a media buy (AdCP create-media-buy). Auth required.",
  tags: ["mcp", "media-buy"],
  body: CreateMediaBuyRequestSchema,
  response: {
    200: CreateMediaBuyResponseSchema,
    400: McpErrorResponseSchema,
    401: McpErrorResponseSchema,
  },
} as const;
