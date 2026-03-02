import { z } from "zod";

export const tenantIdParamsSchema = z.object({
  id: z.string(),
});

export const tenantAndLineItemParamsSchema = z.object({
  id: z.string(),
  lineItemId: z.string(),
});

export const tenantAndSyncIdParamsSchema = z.object({
  id: z.string(),
  syncId: z.string(),
});

export const errorMessageResponseSchema = z.object({
  error: z.string(),
});

export const successErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
});
