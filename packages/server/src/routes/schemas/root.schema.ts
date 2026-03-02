import { z } from "zod";

const SchemasRootProtocolSchema = z.object({
  description: z.string(),
  versions: z.array(z.string()),
  current_version: z.string(),
  url: z.string(),
});

export const schemasRootResponseSchema = z.object({
  protocols: z.object({
    adcp: SchemasRootProtocolSchema,
  }),
  description: z.string(),
  schema_version: z.string(),
});

export const schemasVersionsResponseSchema = z.object({
  available_versions: z.array(z.string()),
  current_version: z.string(),
  description: z.string(),
  latest_url: z.string(),
});

export const schemasHealthSuccessResponseSchema = z.object({
  status: z.literal("healthy"),
  schemas_available: z.number(),
  service: z.string(),
  version: z.string(),
});

export const schemasHealthErrorResponseSchema = z.object({
  status: z.literal("unhealthy"),
  error: z.string(),
  service: z.string(),
});

export const schemasRootRouteSchema = {
  description: "Root schemas endpoint — protocols and versions.",
  tags: ["schemas"],
  response: {
    200: schemasRootResponseSchema,
  },
} as const;

export const schemasAdcpVersionsRouteSchema = {
  description: "List available AdCP schema versions.",
  tags: ["schemas"],
  response: {
    200: schemasVersionsResponseSchema,
  },
} as const;

export const schemasHealthRouteSchema = {
  description: "Health check for schema service.",
  tags: ["schemas", "system"],
  response: {
    200: schemasHealthSuccessResponseSchema,
    500: schemasHealthErrorResponseSchema,
  },
} as const;