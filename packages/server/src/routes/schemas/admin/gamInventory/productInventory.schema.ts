import { z } from "zod";

import {
  inventoryErrorSchema,
  tenantProductParamsSchema,
} from "./_common.schema.js";

const productInventoryItemSchema = z.object({
  mapping_id: z.number(),
  inventory_id: z.string(),
  inventory_name: z.string(),
  inventory_type: z.string(),
  is_primary: z.boolean(),
  status: z.string(),
  path: z.array(z.string()).nullable(),
});

const getProductInventorySuccessSchema = z.object({
  inventory: z.array(productInventoryItemSchema),
  count: z.number(),
});

const assignInventoryBodySchema = z.object({
  inventory_id: z.string().optional(),
  inventory_type: z.string().optional(),
  is_primary: z.boolean().optional(),
});

const updateAssignmentSuccessSchema = z.object({
  message: z.string(),
  mapping_id: z.number(),
  inventory_name: z.string(),
});

const createAssignmentSuccessSchema = z.object({
  message: z.string(),
  mapping_id: z.number().optional(),
  inventory_name: z.string(),
});

const suggestQuerySchema = z.object({
  q: z.string().optional(),
});

const suggestSuccessSchema = z.object({
  suggestions: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      path: z.array(z.string()),
      status: z.string(),
    }),
  ),
  count: z.number(),
});

export const getProductInventoryRouteSchema = {
  description: "Get GAM inventory assignments for product.",
  tags: ["admin", "gam", "inventory"],
  params: tenantProductParamsSchema,
  response: {
    200: getProductInventorySuccessSchema,
    404: inventoryErrorSchema,
  },
} as const;

export const assignProductInventoryRouteSchema = {
  description: "Assign inventory entity to product.",
  tags: ["admin", "gam", "inventory"],
  params: tenantProductParamsSchema,
  body: assignInventoryBodySchema,
  response: {
    200: updateAssignmentSuccessSchema,
    201: createAssignmentSuccessSchema,
    400: inventoryErrorSchema,
    404: inventoryErrorSchema,
  },
} as const;

export const suggestProductInventoryRouteSchema = {
  description: "Suggest inventory entities for product assignment.",
  tags: ["admin", "gam", "inventory"],
  params: tenantProductParamsSchema,
  querystring: suggestQuerySchema,
  response: {
    200: suggestSuccessSchema,
    404: inventoryErrorSchema,
  },
} as const;
