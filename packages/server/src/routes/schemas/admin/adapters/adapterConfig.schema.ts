import { z } from "zod";

import {
  successErrorResponseSchema,
  tenantIdParamsSchema,
} from "./_common.schema.js";

const adapterConfigBodySchema = z.object({
  adapter_type: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

const updateAdapterConfigSuccessSchema = z.object({
  success: z.literal(true),
  adapter_type: z.string(),
});

export const adapterConfigRouteSchema = {
  description: "Create or update tenant adapter config.",
  tags: ["admin", "adapters"],
  params: tenantIdParamsSchema,
  body: adapterConfigBodySchema,
  response: {
    200: updateAdapterConfigSuccessSchema,
    400: successErrorResponseSchema,
    404: successErrorResponseSchema,
  },
} as const;
