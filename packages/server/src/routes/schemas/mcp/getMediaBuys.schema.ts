import {
  GetMediaBuysRequestSchema,
  GetMediaBuysResponseSchema,
} from "../../../schemas/mediaBuyList.js";
import { McpErrorResponseSchema } from "./_common.schema.js";

export const getMediaBuysRouteSchema = {
  description:
    "List media buys for the authenticated principal with optional filters and pagination (AdCP get-media-buys). Auth required.",
  tags: ["mcp", "media-buy"],
  body: GetMediaBuysRequestSchema,
  response: {
    200: GetMediaBuysResponseSchema,
    400: McpErrorResponseSchema,
    401: McpErrorResponseSchema,
  },
} as const;
