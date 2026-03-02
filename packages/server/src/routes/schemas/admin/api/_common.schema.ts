import { z } from "zod";

export const tenantIdParamsSchema = z.object({
  id: z.string(),
});

export const unauthenticatedErrorSchema = z.object({
  error: z.string(),
});
