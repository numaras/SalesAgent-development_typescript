import { z } from "zod";

import {
  reportingErrorSchema,
  reportingQuerySchema,
  tenantIdParamsSchema,
} from "./_common.schema.js";

const baseReportingSuccessSchema = z.object({
  success: z.literal(true),
  data: z.array(z.unknown()),
  metadata: z.object({
    start_date: z.string(),
    end_date: z.string(),
    requested_timezone: z.string(),
    data_timezone: z.string(),
    data_valid_until: z.string(),
    query_type: z.string(),
    dimensions: z.array(z.unknown()),
    metrics: z.array(z.unknown()),
  }),
});

export const gamReportingBaseRouteSchema = {
  description: "Get base GAM reporting response for tenant.",
  tags: ["admin", "gam", "reporting"],
  params: tenantIdParamsSchema,
  querystring: reportingQuerySchema,
  response: {
    200: baseReportingSuccessSchema,
    400: reportingErrorSchema,
    500: reportingErrorSchema,
  },
} as const;
