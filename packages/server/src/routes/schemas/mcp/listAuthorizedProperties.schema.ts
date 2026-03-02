import {
  ListAuthorizedPropertiesRequestSchema,
  ListAuthorizedPropertiesResponseSchema,
} from "../../../schemas/authorizedProperties.js";
import { McpErrorResponseSchema } from "./_common.schema.js";

export const listAuthorizedPropertiesRouteSchema = {
  description:
    "List publisher domains this agent is authorized to represent (AdCP list-authorized-properties). Tenant required; auth optional.",
  tags: ["mcp", "properties"],
  body: ListAuthorizedPropertiesRequestSchema.optional().default({}),
  response: {
    200: ListAuthorizedPropertiesResponseSchema,
    400: McpErrorResponseSchema,
  },
} as const;
