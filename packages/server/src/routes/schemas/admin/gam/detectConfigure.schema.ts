import { z } from "zod";

import {
  errorMessageResponseSchema,
  successErrorResponseSchema,
  tenantIdParamsSchema,
} from "./_common.schema.js";

const detectNetworkBodySchema = z.object({
  refresh_token: z.string().optional(),
  network_code: z.string().optional(),
});

const configureGamBodySchema = z.object({
  auth_method: z.enum(["oauth", "service_account"]).optional(),
  network_code: z.string().optional(),
  refresh_token: z.string().optional(),
  service_account_json: z.string().optional(),
  trafficker_id: z.union([z.string(), z.number()]).optional(),
  order_name_template: z.string().optional(),
  line_item_name_template: z.string().optional(),
  network_currency: z.string().optional(),
  secondary_currencies: z.unknown().optional(),
  network_timezone: z.string().optional(),
});

const getGamConfigNotConfiguredSchema = z.object({
  configured: z.literal(false),
});

const getGamConfigConfiguredSchema = z.object({
  configured: z.literal(true),
  network_code: z.string(),
  auth_method: z.enum(["oauth", "service_account"]),
  has_refresh_token: z.boolean(),
  has_service_account: z.boolean(),
  service_account_email: z.string().nullable(),
  trafficker_id: z.string(),
  network_currency: z.string(),
  secondary_currencies: z.array(z.string()),
  network_timezone: z.string(),
  order_name_template: z.string(),
  line_item_name_template: z.string(),
});

const detectNetworkSuccessSchema = z.object({
  success: z.literal(true),
  network_code: z.string(),
  network_name: z.union([z.string(), z.number()]),
  network_id: z.string(),
  network_count: z.number(),
  trafficker_id: z.null(),
  currency_code: z.string(),
  secondary_currencies: z.array(z.string()),
  timezone: z.string(),
});

const configureValidationErrorSchema = z.object({
  success: z.literal(false),
  errors: z.array(z.string()),
});

const configureSuccessSchema = z.object({
  success: z.literal(true),
  message: z.string(),
});

export const getGamConfigRouteSchema = {
  description: "Get stored GAM config for tenant.",
  tags: ["admin", "gam"],
  params: tenantIdParamsSchema,
  response: {
    200: z.union([getGamConfigNotConfiguredSchema, getGamConfigConfiguredSchema]),
  },
} as const;

export const detectGamNetworkRouteSchema = {
  description: "Detect GAM network by refresh token.",
  tags: ["admin", "gam"],
  params: tenantIdParamsSchema,
  body: detectNetworkBodySchema,
  response: {
    200: detectNetworkSuccessSchema,
    400: successErrorResponseSchema,
    500: successErrorResponseSchema,
  },
} as const;

export const configureGamRouteSchema = {
  description: "Save GAM configuration for tenant.",
  tags: ["admin", "gam"],
  params: tenantIdParamsSchema,
  body: configureGamBodySchema,
  response: {
    200: configureSuccessSchema,
    400: z.union([configureValidationErrorSchema, successErrorResponseSchema]),
    404: successErrorResponseSchema,
  },
} as const;
