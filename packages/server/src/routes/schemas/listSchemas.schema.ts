import { z } from "zod";

const SchemaIndexItemSchema = z.object({
  url: z.string(),
  description: z.string(),
});

export const listSchemasIndexResponseSchema = z.object({
  schemas: z.record(z.string(), SchemaIndexItemSchema),
  version: z.string(),
  schema_version: z.string(),
  base_url: z.string(),
  description: z.string(),
});

export const listSchemasRouteSchema = {
  description: "List all available AdCP v2.4 JSON Schemas (index).",
  tags: ["schemas"],
  response: {
    200: listSchemasIndexResponseSchema,
  },
} as const;

export const listSchemasIndexJsonRouteSchema = {
  description: "List all available AdCP v2.4 JSON Schemas (index, JSON).",
  tags: ["schemas"],
  response: {
    200: listSchemasIndexResponseSchema,
  },
} as const;
