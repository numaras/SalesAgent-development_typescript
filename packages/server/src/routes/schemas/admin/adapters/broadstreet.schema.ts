import { z } from "zod";

import {
  successErrorResponseSchema,
  tenantIdParamsSchema,
} from "./_common.schema.js";

const testBroadstreetConnectionBodySchema = z.object({
  network_id: z.string().optional(),
  api_key: z.string().optional(),
});

const broadstreetConnectionSuccessSchema = z.object({
  success: z.literal(true),
  network_name: z.string(),
  network_id: z.string(),
});

const zoneSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const zonesResponseSchema = z.object({
  zones: z.array(zoneSchema),
  error: z.string().optional(),
});

export const broadstreetTestConnectionRouteSchema = {
  description: "Test Broadstreet connection using provided credentials.",
  tags: ["admin", "adapters", "broadstreet"],
  params: tenantIdParamsSchema,
  body: testBroadstreetConnectionBodySchema,
  response: {
    200: z.union([broadstreetConnectionSuccessSchema, successErrorResponseSchema]),
    400: successErrorResponseSchema,
    500: successErrorResponseSchema,
  },
} as const;

export const broadstreetZonesRouteSchema = {
  description: "Get Broadstreet zones for a tenant.",
  tags: ["admin", "adapters", "broadstreet"],
  params: tenantIdParamsSchema,
  response: {
    200: zonesResponseSchema,
    500: zonesResponseSchema,
  },
} as const;
