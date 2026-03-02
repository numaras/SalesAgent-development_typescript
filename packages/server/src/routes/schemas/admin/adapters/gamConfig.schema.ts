import { z } from "zod";

import {
  errorMessageResponseSchema,
  tenantAndProductParamsSchema,
} from "./_common.schema.js";

const gamProductConfigSchema = z.record(z.string(), z.unknown());

const getGamProductConfigSuccessSchema = z.object({
  tenant_id: z.string(),
  product_id: z.string(),
  product_name: z.string(),
  config: gamProductConfigSchema,
});

const updateGamProductConfigSuccessSchema = z.object({
  success: z.literal(true),
  config: gamProductConfigSchema,
});

export const getGamConfigRouteSchema = {
  description: "Get GAM product configuration for tenant/product.",
  tags: ["admin", "adapters", "gam"],
  params: tenantAndProductParamsSchema,
  response: {
    200: getGamProductConfigSuccessSchema,
    401: errorMessageResponseSchema,
    403: errorMessageResponseSchema,
    404: errorMessageResponseSchema,
  },
} as const;

export const updateGamConfigRouteSchema = {
  description: "Update GAM product configuration for tenant/product.",
  tags: ["admin", "adapters", "gam"],
  params: tenantAndProductParamsSchema,
  body: z.record(z.string(), z.unknown()),
  response: {
    200: updateGamProductConfigSuccessSchema,
    400: errorMessageResponseSchema,
    401: errorMessageResponseSchema,
    403: errorMessageResponseSchema,
    404: errorMessageResponseSchema,
  },
} as const;
