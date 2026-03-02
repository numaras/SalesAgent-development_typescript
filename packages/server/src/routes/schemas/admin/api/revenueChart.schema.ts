import { z } from "zod";

import {
  tenantIdParamsSchema,
  unauthenticatedErrorSchema,
} from "./_common.schema.js";

const revenueChartQuerySchema = z.object({
  period: z.string().optional(),
});

const revenueChartSuccessSchema = z.object({
  labels: z.array(z.string()),
  values: z.array(z.number()),
});

export const revenueChartRouteSchema = {
  description: "Get tenant revenue chart data by principal.",
  tags: ["admin", "api"],
  params: tenantIdParamsSchema,
  querystring: revenueChartQuerySchema,
  response: {
    200: revenueChartSuccessSchema,
    401: unauthenticatedErrorSchema,
  },
} as const;
