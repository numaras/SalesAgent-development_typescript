import { GetAdcpCapabilitiesResponseSchema } from "../../../schemas/adcpCapabilities.js";

export const getAdcpCapabilitiesRouteSchema = {
  description:
    "Get AdCP capabilities (supported protocols, media_buy portfolio/features/execution).",
  tags: ["mcp", "capabilities"],
  response: {
    200: GetAdcpCapabilitiesResponseSchema,
  },
} as const;
