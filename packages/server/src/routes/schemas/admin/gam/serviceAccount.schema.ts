import { z } from "zod";

import {
  successErrorResponseSchema,
  tenantIdParamsSchema,
} from "./_common.schema.js";

const createServiceAccountSuccessSchema = z.object({
  success: z.literal(true),
  service_account_email: z.string(),
  message: z.string(),
});

const getServiceAccountEmailResponseSchema = z.object({
  success: z.literal(true),
  service_account_email: z.string().nullable(),
  message: z.string().optional(),
});

const pingSuccessSchema = z.object({
  success: z.literal(true),
  network: z.object({
    network_code: z.string(),
    display_name: z.string(),
    currency_code: z.string(),
    timezone: z.string(),
  }),
  advertisers: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
    }),
  ),
  advertiser_count: z.number(),
  auth_method: z.string(),
});

const testConnectionSuccessSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  network_code: z.string(),
  display_name: z.string(),
});

export const createServiceAccountRouteSchema = {
  description: "Create and store GAM service account email for tenant.",
  tags: ["admin", "gam"],
  params: tenantIdParamsSchema,
  response: {
    200: createServiceAccountSuccessSchema,
    403: successErrorResponseSchema,
    500: successErrorResponseSchema,
  },
} as const;

export const getServiceAccountEmailRouteSchema = {
  description: "Get saved GAM service account email for tenant.",
  tags: ["admin", "gam"],
  params: tenantIdParamsSchema,
  response: {
    200: getServiceAccountEmailResponseSchema,
  },
} as const;

export const gamPingRouteSchema = {
  description: "Test live GAM API connectivity.",
  tags: ["admin", "gam"],
  params: tenantIdParamsSchema,
  response: {
    200: pingSuccessSchema,
    400: successErrorResponseSchema,
    403: successErrorResponseSchema,
    500: successErrorResponseSchema,
  },
} as const;

export const testGamConnectionRouteSchema = {
  description: "Test GAM connection against current network credentials.",
  tags: ["admin", "gam"],
  params: tenantIdParamsSchema,
  response: {
    200: testConnectionSuccessSchema,
    400: successErrorResponseSchema,
    403: successErrorResponseSchema,
    500: successErrorResponseSchema,
  },
} as const;
