import { z } from "zod";

import {
  tenantIdParamsSchema,
  unauthenticatedErrorSchema,
} from "./_common.schema.js";

const productSummarySchema = z.object({
  product_id: z.string(),
  name: z.string(),
  description: z.string(),
  delivery_type: z.string(),
});

const productsListSuccessSchema = z.object({
  products: z.array(productSummarySchema),
});

const suggestionsQuerySchema = z.object({
  industry: z.string().optional(),
  include_standard: z.string().optional(),
  delivery_type: z.string().optional(),
  max_cpm: z.string().optional(),
  formats: z.union([z.string(), z.array(z.string())]).optional(),
});

const suggestedProductSchema = z.object({
  product_id: z.string(),
  name: z.string(),
  description: z.string(),
  delivery_type: z.string(),
  cpm: z.number().nullable().optional(),
  price_guidance: z.object({
    min: z.number(),
    max: z.number(),
  }).optional(),
  formats: z.array(z.string()),
  countries: z.array(z.string()).nullable().optional(),
  targeting_template: z.record(z.string(), z.unknown()).optional(),
  already_exists: z.boolean(),
  is_industry_specific: z.boolean(),
  match_score: z.number(),
});

const suggestionsSuccessSchema = z.object({
  suggestions: z.array(suggestedProductSchema),
  total_count: z.number(),
  criteria: z.object({
    industry: z.string().nullable(),
    delivery_type: z.string().nullable(),
    max_cpm: z.number().nullable(),
    formats: z.array(z.string()),
  }),
});

export const listTenantProductsRouteSchema = {
  description: "List tenant products for admin panel.",
  tags: ["admin", "api"],
  params: tenantIdParamsSchema,
  response: {
    200: productsListSuccessSchema,
    401: unauthenticatedErrorSchema,
  },
} as const;

export const productSuggestionsRouteSchema = {
  description: "Get product suggestions for tenant.",
  tags: ["admin", "api"],
  params: tenantIdParamsSchema,
  querystring: suggestionsQuerySchema,
  response: {
    200: suggestionsSuccessSchema,
    401: unauthenticatedErrorSchema,
  },
} as const;
