import { z } from "zod";

import {
  errorMessageResponseSchema,
  tenantOnlyParamsSchema,
} from "./_common.schema.js";

const getMockConnectionConfigResponseSchema = z.object({
  tenant_id: z.string(),
  adapter_type: z.literal("mock"),
  dry_run: z.boolean(),
  manual_approval_required: z.boolean(),
}).passthrough();

const updateMockConnectionBodySchema = z.object({
  dry_run: z.union([z.boolean(), z.string(), z.number()]).optional(),
  manual_approval_required: z.union([z.boolean(), z.string(), z.number()]).optional(),
}).passthrough();

const updateMockConnectionSuccessSchema = z.object({
  success: z.literal(true),
  adapter_type: z.literal("mock"),
  config: z.object({
    tenant_id: z.string(),
    dry_run: z.boolean(),
    manual_approval_required: z.boolean(),
  }),
});

export const getMockConnectionConfigRouteSchema = {
  description: "Get tenant-level mock adapter connection config.",
  tags: ["admin", "adapters", "mock"],
  params: tenantOnlyParamsSchema,
  response: {
    200: getMockConnectionConfigResponseSchema,
    401: errorMessageResponseSchema,
    403: errorMessageResponseSchema,
  },
} as const;

export const updateMockConnectionConfigRouteSchema = {
  description: "Update tenant-level mock adapter connection config.",
  tags: ["admin", "adapters", "mock"],
  params: tenantOnlyParamsSchema,
  body: updateMockConnectionBodySchema,
  response: {
    200: updateMockConnectionSuccessSchema,
    401: errorMessageResponseSchema,
    403: errorMessageResponseSchema,
  },
} as const;
