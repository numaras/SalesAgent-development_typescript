import {
  GetMediaBuyDeliveryRequestSchema,
  GetMediaBuyDeliveryResponseSchema,
} from "../../../schemas/mediaBuyDelivery.js";
import { McpErrorResponseSchema } from "./_common.schema.js";

export const getMediaBuyDeliveryRouteSchema = {
  description:
    "Get delivery data for media buys (AdCP get-media-buy-delivery). Auth required.",
  tags: ["mcp", "media-buy", "delivery"],
  body: GetMediaBuyDeliveryRequestSchema.optional().default({}),
  response: {
    200: GetMediaBuyDeliveryResponseSchema,
    400: McpErrorResponseSchema,
    401: McpErrorResponseSchema,
  },
} as const;
