import { z } from "zod";

export const getSchemaParamsSchema = z.object({
  schemaName: z.string(),
});

export const getSchemaNotFoundResponseSchema = z.object({
  error: z.string(),
  requested_schema: z.string(),
  available_schemas: z.array(z.string()),
  note: z.string(),
});

export const getSchemaRouteSchema = {
  description:
    "Get JSON Schema for a specific AdCP response type (e.g. getproducts, listcreatives).",
  tags: ["schemas"],
  params: getSchemaParamsSchema,
  response: {
    200: z.record(z.string(), z.unknown()),
    404: getSchemaNotFoundResponseSchema,
  },
} as const;
