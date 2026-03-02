import {
  GetProductsRequestSchema,
  GetProductsResponseSchema,
} from "../../../schemas/getProducts.js";
import { McpErrorResponseSchema } from "./_common.schema.js";

export const getProductsRouteSchema = {
  description:
    "Get products matching optional brief and filters (AdCP get-products).",
  tags: ["mcp", "products"],
  body: GetProductsRequestSchema.optional().default({}),
  response: {
    200: GetProductsResponseSchema,
    400: McpErrorResponseSchema,
    403: McpErrorResponseSchema,
  },
} as const;
