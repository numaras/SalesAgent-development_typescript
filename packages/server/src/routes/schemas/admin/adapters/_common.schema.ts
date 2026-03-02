import { z } from "zod";

export const tenantIdParamsSchema = z.object({
  id: z.string(),
});

export const tenantAndProductParamsSchema = z.object({
  tenant: z.string(),
  product: z.string(),
});

export const tenantAndProductIdParamsSchema = z.object({
  id: z.string(),
  productId: z.string(),
});

export const tenantAndAdapterNameParamsSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const tenantOnlyParamsSchema = z.object({
  tenant: z.string(),
});

export const adapterTypeParamsSchema = z.object({
  type: z.string(),
});

export const errorMessageResponseSchema = z.object({
  error: z.string(),
});

export const successErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
});
