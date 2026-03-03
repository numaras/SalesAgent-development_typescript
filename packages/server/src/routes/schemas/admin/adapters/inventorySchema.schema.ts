import { z } from "zod";

import { tenantAndAdapterNameParamsSchema } from "./_common.schema.js";

const inventoryEntitySchema = z.object({
  type: z.string(),
  id_field: z.string(),
  name_field: z.string(),
  path_field: z.string().optional(),
  metadata_field: z.string().optional(),
});

const inventorySchemaSuccessSchema = z.object({
  adapter_name: z.string(),
  supports_inventory_sync: z.boolean(),
  supports_inventory_profiles: z.boolean(),
  inventory_entity_label: z.string(),
  entities: z.array(inventoryEntitySchema),
});

const errorResponseSchema = z.object({
  error: z.string(),
});

export const inventorySchemaRouteSchema = {
  description: "Get adapter inventory schema metadata.",
  tags: ["admin", "adapters"],
  params: tenantAndAdapterNameParamsSchema,
  response: {
    200: inventorySchemaSuccessSchema,
    404: errorResponseSchema,
  },
} as const;
