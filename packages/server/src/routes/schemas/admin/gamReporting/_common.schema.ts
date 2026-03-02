import { z } from "zod";

export const tenantIdParamsSchema = z.object({
  id: z.string(),
});

export const tenantPrincipalParamsSchema = z.object({
  id: z.string(),
  p_id: z.string(),
});

export const tenantAdvertiserSummaryParamsSchema = z.object({
  id: z.string(),
  adv_id: z.string(),
});

export const reportingQuerySchema = z.object({
  date_range: z.string().optional(),
  advertiser_id: z.string().optional(),
  order_id: z.string().optional(),
  line_item_id: z.string().optional(),
  timezone: z.string().optional(),
});

export const reportingSummaryQuerySchema = z.object({
  date_range: z.string().optional(),
  timezone: z.string().optional(),
});

export const reportingErrorSchema = z.object({
  error: z.string(),
});
