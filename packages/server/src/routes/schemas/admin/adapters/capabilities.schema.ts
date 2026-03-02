import { z } from "zod";

import {
  adapterTypeParamsSchema,
  errorMessageResponseSchema,
} from "./_common.schema.js";

const adapterCapabilitiesSchema = z.object({
  supports_inventory_sync: z.boolean(),
  supports_inventory_profiles: z.boolean(),
  inventory_entity_label: z.string(),
  supports_custom_targeting: z.boolean(),
  supports_geo_targeting: z.boolean(),
  supports_dynamic_products: z.boolean(),
  supported_pricing_models: z.array(z.string()).nullable(),
  supports_webhooks: z.boolean(),
  supports_realtime_reporting: z.boolean(),
});

export const capabilitiesRouteSchema = {
  description: "Get capabilities for a specific adapter type.",
  tags: ["admin", "adapters"],
  params: adapterTypeParamsSchema,
  response: {
    200: adapterCapabilitiesSchema,
    401: errorMessageResponseSchema,
    403: errorMessageResponseSchema,
    404: errorMessageResponseSchema,
  },
} as const;
