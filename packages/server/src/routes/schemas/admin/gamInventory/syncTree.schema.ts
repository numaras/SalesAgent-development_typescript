import { z } from "zod";

import {
  inventoryErrorSchema,
  tenantIdParamsSchema,
} from "./_common.schema.js";

const syncInventoryResponseSchema = z.object({
  sync_id: z.string(),
  status: z.string(),
  message: z.string(),
});

const syncAlreadyRunningSchema = z.object({
  error: z.string(),
  sync_id: z.string(),
});

const treeQuerySchema = z.object({
  search: z.string().optional(),
});

const treeSuccessSchema = z.object({
  root_units: z.array(z.unknown()),
  total_units: z.number(),
  root_count: z.number(),
  placements: z.number(),
  labels: z.number(),
  custom_targeting_keys: z.number(),
  audience_segments: z.number(),
  search_active: z.boolean(),
  matching_count: z.number(),
  last_sync: z.string().nullable(),
});

const searchQuerySchema = z.object({
  search: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
});

const searchSuccessSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      path: z.array(z.string()),
      status: z.string(),
      metadata: z.record(z.string(), z.unknown()),
    }),
  ),
  count: z.number(),
  total: z.number(),
  has_more: z.boolean(),
});

export const syncInventoryRouteSchema = {
  description: "Start GAM inventory sync for tenant.",
  tags: ["admin", "gam", "inventory"],
  params: tenantIdParamsSchema,
  response: {
    202: syncInventoryResponseSchema,
    400: z.union([inventoryErrorSchema, syncAlreadyRunningSchema]),
    404: inventoryErrorSchema,
  },
} as const;

export const inventoryTreeRouteSchema = {
  description: "Get hierarchical GAM inventory tree.",
  tags: ["admin", "gam", "inventory"],
  params: tenantIdParamsSchema,
  querystring: treeQuerySchema,
  response: {
    200: treeSuccessSchema,
    404: inventoryErrorSchema,
  },
} as const;

export const inventorySearchRouteSchema = {
  description: "Search GAM inventory entities.",
  tags: ["admin", "gam", "inventory"],
  params: tenantIdParamsSchema,
  querystring: searchQuerySchema,
  response: {
    200: searchSuccessSchema,
    404: inventoryErrorSchema,
  },
} as const;
