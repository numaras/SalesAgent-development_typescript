import { z } from "zod";

import {
  errorMessageResponseSchema,
  successErrorResponseSchema,
  tenantAndLineItemParamsSchema,
} from "./_common.schema.js";

const lineItemResponseSchema = z.object({
  line_item_id: z.string(),
  order_id: z.string(),
  name: z.string(),
  status: z.string(),
  type: z.string(),
  priority: z.number().nullable().optional(),
  cost_type: z.string().nullable().optional(),
  cost_per_unit: z.number().nullable().optional(),
  currency: z.null(),
  goal_type: z.string().nullable().optional(),
  goal_units: z.number().nullable().optional(),
  units_delivered: z.number(),
  impressions_delivered: z.number(),
  clicks_delivered: z.number(),
  ctr: z.number(),
  delivery_percentage: z.number(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  last_synced: z.string().nullable(),
  targeting: z.unknown().nullable().optional(),
  raw_data: z.null(),
});

const lineItemHtmlRouteSuccessSchema = z.object({
  tenant: z.object({
    tenant_id: z.string(),
    name: z.string(),
  }),
  tenant_id: z.string(),
  line_item: lineItemResponseSchema,
  order: z
    .object({
      orderId: z.string(),
      name: z.string(),
      advertiserId: z.string().nullable(),
      advertiserName: z.string().nullable(),
      status: z.string(),
      startDate: z.date().nullable(),
      endDate: z.date().nullable(),
    })
    .nullable(),
});

const lineItemApiSuccessSchema = z.object({
  success: z.literal(true),
  line_item: lineItemResponseSchema,
});

const gamNotConnectedSchema = z.object({
  error: z.string(),
});

export const lineItemViewRouteSchema = {
  description: "Fetch line item details payload for tenant.",
  tags: ["admin", "gam"],
  params: tenantAndLineItemParamsSchema,
  response: {
    200: lineItemHtmlRouteSuccessSchema,
    400: gamNotConnectedSchema,
    404: errorMessageResponseSchema,
  },
} as const;

export const lineItemApiRouteSchema = {
  description: "Fetch line item details via API endpoint.",
  tags: ["admin", "gam"],
  params: tenantAndLineItemParamsSchema,
  response: {
    200: lineItemApiSuccessSchema,
    400: successErrorResponseSchema,
    404: successErrorResponseSchema,
  },
} as const;
