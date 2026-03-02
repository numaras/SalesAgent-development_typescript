import { z } from "zod";

export const tenantIdParamsSchema = z.object({
  id: z.string(),
});

export const tenantProductParamsSchema = z.object({
  id: z.string(),
  p_id: z.string(),
});

export const tenantKeyParamsSchema = z.object({
  id: z.string(),
  key_id: z.string(),
});

export const inventoryErrorSchema = z.object({
  error: z.string(),
});
