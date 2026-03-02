import { z } from "zod";

import {
  reportingErrorSchema,
  reportingQuerySchema,
  reportingSummaryQuerySchema,
  tenantPrincipalParamsSchema,
} from "./_common.schema.js";

const principalReportingSuccessSchema = z.object({
  success: z.literal(true),
  principal_id: z.string(),
  advertiser_id: z.string(),
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

const principalSummarySuccessSchema = z.object({
  success: z.literal(true),
  data: z.object({
    principal_id: z.string(),
    advertiser_id: z.string(),
    total_impressions: z.number(),
    total_spend: z.number(),
    avg_cpm: z.number(),
  }),
});

export const principalGamReportingRouteSchema = {
  description: "Get GAM reporting for principal advertiser.",
  tags: ["admin", "gam", "reporting"],
  params: tenantPrincipalParamsSchema,
  querystring: reportingQuerySchema,
  response: {
    200: principalReportingSuccessSchema,
    400: reportingErrorSchema,
    404: reportingErrorSchema,
    500: reportingErrorSchema,
  },
} as const;

export const principalGamReportingSummaryRouteSchema = {
  description: "Get GAM reporting summary for principal advertiser.",
  tags: ["admin", "gam", "reporting"],
  params: tenantPrincipalParamsSchema,
  querystring: reportingSummaryQuerySchema,
  response: {
    200: principalSummarySuccessSchema,
    400: reportingErrorSchema,
    404: reportingErrorSchema,
    500: reportingErrorSchema,
  },
} as const;