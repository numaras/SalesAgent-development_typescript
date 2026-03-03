/**
 * Schema registry service: build and serve JSON Schema registry for AdCP response types.
 *
 * Generates real JSON Schema from Zod schemas using z.toJSONSchema() (Zod v4 native).
 *
 * Legacy equivalent: _legacy/src/core/schema_validation.py → create_schema_registry()
 *   Python uses Pydantic model_json_schema() to generate full property definitions.
 *   This TS implementation uses z.toJSONSchema() for equivalent real schema output.
 */
import { z } from "zod";

import { GetMediaBuyDeliveryResponseSchema } from "../schemas/mediaBuyDelivery.js";
import { UpdatePerformanceIndexResponseSchema } from "../schemas/performanceIndex.js";
import { GetProductsResponseSchema } from "../schemas/getProducts.js";
import { ListCreativeFormatsResponseSchema } from "../schemas/creativeFormats.js";
import { ListAuthorizedPropertiesResponseSchema } from "../schemas/authorizedProperties.js";
import { SyncCreativesResponseSchema } from "../schemas/syncCreatives.js";
import { ListCreativesResponseSchema } from "../schemas/creative.js";

export interface SchemaRegistry {
  [schemaName: string]: Record<string, unknown>;
}

/** Normalize schema name for lookup: lowercase, no underscores or hyphens. */
export function normalizeSchemaName(name: string): string {
  return name.toLowerCase().replace(/[-_]/g, "");
}

/**
 * Schema entries: normalized name → Zod schema.
 * Mirrors Python create_schema_registry() in _legacy/src/core/schema_validation.py L25-61.
 */
const SCHEMA_ENTRIES: Array<{ name: string; zodSchema: z.ZodTypeAny }> = [
  { name: "getproducts", zodSchema: GetProductsResponseSchema },
  { name: "listcreativeformats", zodSchema: ListCreativeFormatsResponseSchema },
  {
    name: "listauthorizedproperties",
    zodSchema: ListAuthorizedPropertiesResponseSchema,
  },
  { name: "synccreatives", zodSchema: SyncCreativesResponseSchema },
  { name: "listcreatives", zodSchema: ListCreativesResponseSchema },
  { name: "getmediabuydelivery", zodSchema: GetMediaBuyDeliveryResponseSchema },
  {
    name: "updateperformanceindex",
    zodSchema: UpdatePerformanceIndexResponseSchema,
  },
];

const getSignalsSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    signals: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: true,
      },
      description: "Array of available signals",
    },
    errors: {
      type: "array",
      items: {
        type: "object",
        properties: {
          code: { type: "string" },
          message: { type: "string" },
        },
        required: ["code", "message"],
        additionalProperties: true,
      },
    },
    context: {
      type: "object",
      additionalProperties: true,
    },
    ext: {
      type: "object",
      additionalProperties: true,
    },
  },
  required: ["signals"],
  additionalProperties: true,
};

/**
 * Build the schema registry: map normalized name → JSON Schema object.
 * Uses z.toJSONSchema() (Zod v4 native) to generate real JSON Schema with
 * full property definitions, types, required fields — matching Python's
 * model_json_schema() output.
 *
 * Unrepresentable Zod types (e.g. z.transform, z.date) are converted to {} via
 * unrepresentable: "any" to prevent build-time errors in edge-case schemas.
 */
export function createSchemaRegistry(baseUrl: string = ""): SchemaRegistry {
  const registry: SchemaRegistry = {};

  for (const { name, zodSchema } of SCHEMA_ENTRIES) {
    const jsonSchema = z.toJSONSchema(zodSchema, {
      target: "draft-2020-12",
      unrepresentable: "any",
    }) as Record<string, unknown>;

    // Union schemas (anyOf/oneOf) produce no top-level "type". All AdCP response
    // schemas are objects at runtime, so we add the fallback to satisfy consumers
    // that expect type:"object" (matches Python model_json_schema() behaviour for
    // Pydantic BaseModel subclasses).
    const type =
      (jsonSchema["type"] as string | undefined) ??
      ("anyOf" in jsonSchema || "oneOf" in jsonSchema ? "object" : "object");

    registry[name] = {
      ...jsonSchema,
      type,
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: baseUrl ? `${baseUrl}/schemas/adcp/v2.4/${name}.json` : undefined,
      title:
        (jsonSchema["title"] as string | undefined) ??
        `AdCP ${name} Response Schema`,
      description:
        (jsonSchema["description"] as string | undefined) ??
        `JSON Schema for AdCP v2.4 ${name} response validation`,
    };
  }

  registry["getsignals"] = {
    ...getSignalsSchema,
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: baseUrl ? `${baseUrl}/schemas/adcp/v2.4/getsignals.json` : undefined,
    title: "AdCP getsignals Response Schema",
    description: "JSON Schema for AdCP v2.4 getsignals response validation",
  };

  return registry;
}

/**
 * Get a single schema by name (after normalizing). Returns null if not found.
 */
export function getSchema(
  registry: SchemaRegistry,
  schemaName: string,
): Record<string, unknown> | null {
  const normalized = normalizeSchemaName(schemaName);
  for (const [key, schema] of Object.entries(registry)) {
    if (normalizeSchemaName(key) === normalized) {
      return schema as Record<string, unknown>;
    }
  }
  return null;
}

/**
 * List all schema names in the registry.
 */
export function listSchemaNames(registry: SchemaRegistry): string[] {
  return Object.keys(registry);
}
