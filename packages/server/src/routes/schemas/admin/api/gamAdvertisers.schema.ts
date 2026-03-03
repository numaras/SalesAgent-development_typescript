import { z } from "zod";

import { unauthenticatedErrorSchema } from "./_common.schema.js";

const basicErrorSchema = z.object({
  error: z.string(),
});

const getAdvertisersBodySchema = z.object({
  tenant_id: z.string().optional(),
  search: z.string().optional(),
  limit: z.union([z.number(), z.string()]).optional(),
});

const advertisersSuccessSchema = z.object({
  success: z.literal(true),
  advertisers: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
    }),
  ),
  count: z.number(),
  search: z.string().nullable(),
  fetch_all: z.boolean(),
  limit: z.number(),
});

const testConnectionBodySchema = z.object({
  refresh_token: z.string(),
});

const testConnectionSuccessSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  networks: z.array(
    z.object({
      id: z.string(),
      display_name: z.string(),
      currency_code: z.unknown().nullable(),
      timezone: z.unknown().nullable(),
    }),
  ),
});

const testConnectionFailureSchema = z.object({
  success: z.literal(false),
  error: z.string(),
});

export const getGamAdvertisersRouteSchema = {
  description: "Get advertisers for GAM mapping.",
  tags: ["admin", "api", "gam"],
  body: getAdvertisersBodySchema,
  response: {
    200: advertisersSuccessSchema,
    400: basicErrorSchema,
    401: unauthenticatedErrorSchema,
    404: basicErrorSchema,
    500: basicErrorSchema,
  },
} as const;

export const testGamConnectionByRefreshTokenRouteSchema = {
  description: "Test GAM API connection using OAuth refresh token.",
  tags: ["admin", "api", "gam"],
  body: testConnectionBodySchema,
  response: {
    200: testConnectionSuccessSchema,
    400: basicErrorSchema,
    401: unauthenticatedErrorSchema,
    500: testConnectionFailureSchema,
  },
} as const;
