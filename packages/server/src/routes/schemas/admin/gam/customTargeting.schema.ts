import { z } from "zod";

import {
  errorMessageResponseSchema,
  tenantIdParamsSchema,
} from "./_common.schema.js";

const customTargetingKeySchema = z.object({
  id: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  name: z.string(),
  displayName: z.string(),
  status: z.literal("ACTIVE"),
});

const customTargetingSuccessSchema = z.object({
  success: z.literal(true),
  keys: z.array(customTargetingKeySchema),
});

const gamNotConnectedSchema = z.object({
  error: z.string(),
});

export const customTargetingRouteSchema = {
  description: "Return configured GAM custom targeting keys for tenant.",
  tags: ["admin", "gam"],
  params: tenantIdParamsSchema,
  response: {
    200: customTargetingSuccessSchema,
    400: gamNotConnectedSchema,
    404: errorMessageResponseSchema,
  },
} as const;
