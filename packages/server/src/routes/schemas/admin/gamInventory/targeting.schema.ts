import { z } from "zod";

import {
  inventoryErrorSchema,
  tenantIdParamsSchema,
  tenantKeyParamsSchema,
} from "./_common.schema.js";

const targetingAllSuccessSchema = z.object({
  customKeys: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      display_name: z.string(),
      status: z.string(),
      type: z.string(),
    }),
  ),
  audiences: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.unknown().optional(),
      status: z.string(),
      size: z.unknown().optional(),
      type: z.string(),
    }),
  ),
  labels: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.unknown().optional(),
      is_active: z.boolean(),
    }),
  ),
  last_sync: z.string().nullable(),
});

const targetingValuesSuccessSchema = z.object({
  values: z.array(z.unknown()),
  count: z.number(),
});

export const getTargetingAllRouteSchema = {
  description: "Get all synced GAM targeting entities.",
  tags: ["admin", "gam", "targeting"],
  params: tenantIdParamsSchema,
  response: {
    200: targetingAllSuccessSchema,
    404: inventoryErrorSchema,
  },
} as const;

export const getTargetingValuesRouteSchema = {
  description: "Get values for custom targeting key.",
  tags: ["admin", "gam", "targeting"],
  params: tenantKeyParamsSchema,
  response: {
    200: targetingValuesSuccessSchema,
    400: inventoryErrorSchema,
    404: inventoryErrorSchema,
    500: inventoryErrorSchema,
  },
} as const;
