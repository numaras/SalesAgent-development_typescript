import { z } from "zod";

import {
  errorMessageResponseSchema,
  tenantAndProductIdParamsSchema,
} from "./_common.schema.js";

const mockProductConfigSchema = z.record(z.string(), z.unknown());

const getMockProductConfigSuccessSchema = z.object({
  tenant_id: z.string(),
  product_id: z.string(),
  product_name: z.string(),
  config: z.unknown(),
});

const updateMockProductConfigSuccessSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  config: mockProductConfigSchema,
});

export const getMockConfigRouteSchema = {
  description: "Get mock adapter config for product.",
  tags: ["admin", "adapters", "mock"],
  params: tenantAndProductIdParamsSchema,
  response: {
    200: getMockProductConfigSuccessSchema,
    404: errorMessageResponseSchema,
  },
} as const;

export const updateMockConfigRouteSchema = {
  description: "Update mock adapter config for product.",
  tags: ["admin", "adapters", "mock"],
  params: tenantAndProductIdParamsSchema,
  body: z.record(z.string(), z.unknown()).optional(),
  response: {
    200: updateMockProductConfigSuccessSchema,
    404: errorMessageResponseSchema,
  },
} as const;
