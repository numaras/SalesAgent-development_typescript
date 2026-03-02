import {
  UpdateMediaBuyRequestSchema,
  UpdateMediaBuyResponseSchema,
} from "../../../schemas/mediaBuyUpdate.js";
import { McpErrorResponseSchema } from "./_common.schema.js";

export const updateMediaBuyRouteSchema = {
  description: "Update a media buy (AdCP update-media-buy). Auth required.",
  tags: ["mcp", "media-buy"],
  body: UpdateMediaBuyRequestSchema,
  response: {
    200: UpdateMediaBuyResponseSchema,
    400: McpErrorResponseSchema,
    401: McpErrorResponseSchema,
  },
} as const;
