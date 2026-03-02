/**
 * Unit tests for schemaRegistryService.
 *
 * Covers: normalizeSchemaName, createSchemaRegistry, getSchema, listSchemaNames.
 */
import { describe, expect, it } from "vitest";

import {
  createSchemaRegistry,
  getSchema,
  listSchemaNames,
  normalizeSchemaName,
} from "./schemaRegistryService.js";

describe("normalizeSchemaName", () => {
  it("lowercases and removes underscores and hyphens", () => {
    expect(normalizeSchemaName("GetProducts")).toBe("getproducts");
    expect(normalizeSchemaName("get_products")).toBe("getproducts");
    expect(normalizeSchemaName("get-products")).toBe("getproducts");
    expect(normalizeSchemaName("GET_PRODUCTS")).toBe("getproducts");
  });
});

describe("createSchemaRegistry", () => {
  it("returns registry with expected schema names", () => {
    const registry = createSchemaRegistry("");
    expect(listSchemaNames(registry)).toContain("getproducts");
    expect(listSchemaNames(registry)).toContain("listcreatives");
    expect(listSchemaNames(registry)).toContain("getmediabuydelivery");
    expect(Object.keys(registry).length).toBeGreaterThanOrEqual(8);
  });

  it("each entry has type object and optional $id", () => {
    const registry = createSchemaRegistry("");
    for (const schema of Object.values(registry)) {
      expect(schema).toHaveProperty("type", "object");
      expect(schema).toHaveProperty("title");
      expect(schema).toHaveProperty("description");
      expect(schema).toHaveProperty("$schema");
    }
  });

  it("with baseUrl sets $id on each schema", () => {
    const registry = createSchemaRegistry("https://example.com");
    const getproducts = registry.getproducts ?? registry["getproducts"];
    expect(getproducts).toBeDefined();
    expect(getproducts.$id).toBe(
      "https://example.com/schemas/adcp/v2.4/getproducts.json",
    );
  });
});

describe("getSchema", () => {
  it("returns schema when name matches", () => {
    const registry = createSchemaRegistry("");
    const schema = getSchema(registry, "getproducts");
    expect(schema).not.toBeNull();
    expect(schema).toHaveProperty("type", "object");
  });

  it("returns schema when name has different casing or separators", () => {
    const registry = createSchemaRegistry("");
    expect(getSchema(registry, "GetProducts")).not.toBeNull();
    expect(getSchema(registry, "get_products")).not.toBeNull();
    expect(getSchema(registry, "get-products")).not.toBeNull();
  });

  it("returns null when name not in registry", () => {
    const registry = createSchemaRegistry("");
    expect(getSchema(registry, "unknown")).toBeNull();
    expect(getSchema(registry, "")).toBeNull();
  });
});

describe("listSchemaNames", () => {
  it("returns all registry keys", () => {
    const registry = createSchemaRegistry("");
    const names = listSchemaNames(registry);
    expect(Array.isArray(names)).toBe(true);
    expect(names).toContain("getproducts");
    expect(names).toContain("listcreatives");
    expect(names.length).toBe(Object.keys(registry).length);
  });
});
