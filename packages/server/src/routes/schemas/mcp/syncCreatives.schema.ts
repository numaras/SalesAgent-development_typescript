import {
  SyncCreativesRequestSchema,
  SyncCreativesResponseSchema,
} from "../../../schemas/syncCreatives.js";
import { McpErrorResponseSchema } from "./_common.schema.js";

export const syncCreativesRouteSchema = {
  description:
    "Sync creative assets to the library (AdCP sync-creatives). Auth required.",
  tags: ["mcp", "creatives"],
  body: SyncCreativesRequestSchema,
  response: {
    200: SyncCreativesResponseSchema,
    400: McpErrorResponseSchema,
    401: McpErrorResponseSchema,
  },
} as const;
