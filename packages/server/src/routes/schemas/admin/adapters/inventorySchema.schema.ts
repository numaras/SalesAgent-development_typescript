import { z } from "zod";

import { tenantAndAdapterNameParamsSchema } from "./_common.schema.js";

const notImplementedResponseSchema = z.object({
  error: z.string(),
  adapter_name: z.string(),
  message: z.string(),
});

export const inventorySchemaRouteSchema = {
  description: "Inventory schema endpoint placeholder for adapter.",
  tags: ["admin", "adapters"],
  params: tenantAndAdapterNameParamsSchema,
  response: {
    501: notImplementedResponseSchema,
  },
} as const;
