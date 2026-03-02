import { z } from "zod";

import {
  reportingErrorSchema,
  reportingQuerySchema,
  reportingSummaryQuerySchema,
  tenantAdvertiserSummaryParamsSchema,
  tenantIdParamsSchema,
} from "./_common.schema.js";

const listBreakdownSuccessSchema = z.object({
  success: z.literal(true),
  data: z.array(z.unknown()),
});

const advertiserSummarySuccessSchema = z.object({
  success: z.literal(true),
  data: z.record(z.string(), z.unknown()),
});

export const gamReportingCountriesRouteSchema = {
  description: "Get GAM reporting country breakdown.",
  tags: ["admin", "gam", "reporting"],
  params: tenantIdParamsSchema,
  querystring: reportingQuerySchema,
  response: {
    200: listBreakdownSuccessSchema,
    400: reportingErrorSchema,
    500: reportingErrorSchema,
  },
} as const;

export const gamReportingAdUnitsRouteSchema = {
  description: "Get GAM reporting ad units breakdown.",
  tags: ["admin", "gam", "reporting"],
  params: tenantIdParamsSchema,
  querystring: reportingQuerySchema,
  response: {
    200: listBreakdownSuccessSchema,
    400: reportingErrorSchema,
    500: reportingErrorSchema,
  },
} as const;

export const gamReportingAdvertiserSummaryRouteSchema = {
  description: "Get GAM advertiser reporting summary.",
  tags: ["admin", "gam", "reporting"],
  params: tenantAdvertiserSummaryParamsSchema,
  querystring: reportingSummaryQuerySchema,
  response: {
    200: advertiserSummarySuccessSchema,
    400: reportingErrorSchema,
    500: reportingErrorSchema,
  },
} as const;
