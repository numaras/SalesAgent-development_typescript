import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

type AnyRecord = Record<string, unknown>;
type ZodLikeSchema = {
  safeParse: (data: unknown) => { success: boolean };
  _zod?: { def?: AnyRecord };
  def?: AnyRecord;
  _def?: AnyRecord;
  type?: unknown;
};

const SERVER_SRC_DIR = path.resolve(process.cwd(), "src");

function isZodSchema(value: unknown): value is ZodLikeSchema {
  return (
    typeof value === "object" &&
    value !== null &&
    "safeParse" in value &&
    typeof (value as { safeParse?: unknown }).safeParse === "function"
  );
}

function isPlainObject(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRouteSchemaObject(value: unknown): boolean {
  if (!isPlainObject(value)) return false;

  const hasRouteKeys =
    "body" in value ||
    "params" in value ||
    "querystring" in value ||
    "headers" in value ||
    "response" in value;

  if (!hasRouteKeys) return false;

  for (const key of ["body", "params", "querystring", "headers"] as const) {
    if (key in value && !isZodSchema(value[key])) {
      return false;
    }
  }

  if ("response" in value) {
    if (!isPlainObject(value.response)) return false;
    for (const responseSchema of Object.values(value.response)) {
      if (!isZodSchema(responseSchema)) {
        return false;
      }
    }
  }

  return true;
}

async function collectTsFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return collectTsFiles(fullPath);
      if (
        entry.isFile() &&
        entry.name.endsWith(".ts") &&
        !entry.name.endsWith(".spec.ts")
      ) {
        return [fullPath];
      }
      return [];
    }),
  );

  return files.flat();
}

async function collectZodSchemaFiles(): Promise<string[]> {
  const allFiles = await collectTsFiles(SERVER_SRC_DIR);
  const schemaFiles = allFiles.filter((filePath) =>
    filePath.includes(`${path.sep}schemas${path.sep}`),
  );

  const withZod = await Promise.all(
    schemaFiles.map(async (filePath) => {
      const content = await readFile(filePath, "utf8");
      return content.includes('from "zod"') || content.includes("from 'zod'")
        ? filePath
        : null;
    }),
  );

  return withZod.filter((x): x is string => x !== null).sort();
}

function getSchemaType(schema: ZodLikeSchema): string | null {
  if (typeof schema.type === "string") return schema.type;
  const zodDefType = schema._zod?.def?.type;
  if (typeof zodDefType === "string") return zodDefType;
  const defType = schema.def?.type;
  if (typeof defType === "string") return defType;
  const legacyDefType = schema._def?.type;
  if (typeof legacyDefType === "string") return legacyDefType;
  return null;
}

function getDef(schema: ZodLikeSchema): AnyRecord {
  return (
    (schema._zod?.def as AnyRecord | undefined) ??
    (schema.def as AnyRecord | undefined) ??
    (schema._def as AnyRecord | undefined) ??
    {}
  );
}

function getObjectShape(schema: ZodLikeSchema): AnyRecord {
  const asAny = schema as unknown as { shape?: unknown };
  if (typeof asAny.shape === "function") {
    const shape = asAny.shape();
    if (isPlainObject(shape)) return shape;
  }
  if (isPlainObject(asAny.shape)) {
    return asAny.shape;
  }

  const def = getDef(schema);
  const shape = def["shape"];
  if (typeof shape === "function") {
    const result = shape();
    if (isPlainObject(result)) return result;
  }
  if (isPlainObject(shape)) return shape;
  return {};
}

function isOptionalSchema(schema: ZodLikeSchema): boolean {
  return getSchemaType(schema) === "optional";
}

function isPermissiveSchema(schema: ZodLikeSchema): boolean {
  const type = getSchemaType(schema);
  if (type === "any" || type === "unknown") return true;
  if (type !== "union") return false;

  const def = getDef(schema);
  const options = Array.isArray(def["options"]) ? (def["options"] as unknown[]) : [];
  return options.some((option) => isZodSchema(option) && isPermissiveSchema(option));
}

function candidateValues(): unknown[] {
  return [
    undefined,
    null,
    "valid@example.com",
    "https://example.com",
    "tenant-1",
    "2026-01-01T00:00:00Z",
    "x",
    1,
    0,
    true,
    false,
    [],
    ["x"],
    {},
    { id: "x" },
    new Date(),
  ];
}

function typedCandidateValues(type: string | null): unknown[] {
  switch (type) {
    case "string":
      return [
        "x",
        "valid@example.com",
        "https://example.com",
        "tenant-1",
        "2026-01-01T00:00:00Z",
      ];
    case "number":
      return [1, 0, -1, 1.5];
    case "boolean":
      return [true, false];
    case "array":
      return [[], ["x"]];
    case "object":
      return [
        {},
        { name: "x" },
        { id: "x" },
        { tenant_id: "tenant_1" },
        { media_buy_id: "mb_1" },
        { buyer_ref: "buyer_1" },
        { task_id: "task_1" },
        { product_id: "product_1" },
      ];
    default:
      return [];
  }
}

function findValidValue(
  schema: ZodLikeSchema,
  depth = 0,
): { found: true; value: unknown } | { found: false } {
  const type = getSchemaType(schema);
  const candidates = [
    buildValidSample(schema, depth),
    ...typedCandidateValues(type),
    ...candidateValues(),
  ];

  for (const candidate of candidates) {
    if (schema.safeParse(candidate).success) {
      return { found: true, value: candidate };
    }
  }

  return { found: false };
}

function buildValidSample(schema: ZodLikeSchema, depth = 0): unknown {
  if (depth > 6) return {};

  const type = getSchemaType(schema);
  const def = getDef(schema);

  switch (type) {
    case "string":
      return "x";
    case "number":
      return 1;
    case "boolean":
      return true;
    case "bigint":
      return BigInt(1);
    case "date":
      return new Date();
    case "symbol":
      return Symbol("x");
    case "literal": {
      const values = Array.isArray(def["values"]) ? (def["values"] as unknown[]) : [];
      if (values.length > 0) return values[0];
      const value = def["value"];
      if (value !== undefined) return value;
      return "x";
    }
    case "enum": {
      const entries = def["entries"];
      if (isPlainObject(entries)) {
        const vals = Object.values(entries);
        if (vals.length > 0) return vals[0];
      }
      return "x";
    }
    case "nativeEnum": {
      const entries = def["entries"];
      if (isPlainObject(entries)) {
        const vals = Object.values(entries).filter(
          (v) => typeof v !== "number" || !Object.keys(entries).includes(String(v)),
        );
        if (vals.length > 0) return vals[0];
      }
      return "x";
    }
    case "optional":
      return undefined;
    case "nullable":
      return null;
    case "default": {
      const inner = def["innerType"];
      if (isZodSchema(inner)) return buildValidSample(inner, depth + 1);
      return undefined;
    }
    case "catch": {
      const inner = def["innerType"];
      if (isZodSchema(inner)) return buildValidSample(inner, depth + 1);
      return "x";
    }
    case "array": {
      const element = def["element"];
      if (isZodSchema(element)) {
        const elementValue = findValidValue(element, depth + 1);
        return [
          elementValue.found
            ? elementValue.value
            : buildValidSample(element, depth + 1),
        ];
      }
      return ["x"];
    }
    case "tuple": {
      const items = Array.isArray(def["items"]) ? (def["items"] as unknown[]) : [];
      return items.map((item) =>
        isZodSchema(item)
          ? (() => {
              const value = findValidValue(item, depth + 1);
              return value.found ? value.value : buildValidSample(item, depth + 1);
            })()
          : "x",
      );
    }
    case "record": {
      const valueType = def["valueType"];
      const value = isZodSchema(valueType)
        ? (() => {
            const resolved = findValidValue(valueType, depth + 1);
            return resolved.found
              ? resolved.value
              : buildValidSample(valueType, depth + 1);
          })()
        : "x";
      return { key: value };
    }
    case "union": {
      const options = Array.isArray(def["options"]) ? (def["options"] as unknown[]) : [];
      const first = options.find((option): option is ZodLikeSchema => isZodSchema(option));
      if (first) {
        const resolved = findValidValue(first, depth + 1);
        return resolved.found ? resolved.value : buildValidSample(first, depth + 1);
      }
      return "x";
    }
    case "intersection": {
      const left = def["left"];
      const right = def["right"];
      const leftSample = isZodSchema(left) ? buildValidSample(left, depth + 1) : {};
      const rightSample = isZodSchema(right) ? buildValidSample(right, depth + 1) : {};
      if (isPlainObject(leftSample) && isPlainObject(rightSample)) {
        return { ...leftSample, ...rightSample };
      }
      return leftSample;
    }
    case "object": {
      const shape = getObjectShape(schema);
      const output: AnyRecord = {};
      for (const [key, child] of Object.entries(shape)) {
        if (!isZodSchema(child)) continue;
        if (isOptionalSchema(child)) continue;
        const value = findValidValue(child, depth + 1);
        output[key] = value.found ? value.value : buildValidSample(child, depth + 1);
      }
      return output;
    }
    case "any":
    case "unknown":
      return { arbitrary: true };
    default:
      return "x";
  }
}

function assertSchemaBehavior(schema: ZodLikeSchema, schemaLabel: string): void {
  const validResult = findValidValue(schema);
  expect(validResult.found, `${schemaLabel} should accept at least one valid value`).toBe(true);

  if (isPermissiveSchema(schema)) {
    return;
  }

  const invalidCandidates = [
    Symbol("invalid"),
    () => "invalid",
    { __invalid: true },
    ["__invalid"],
    Number.NaN,
  ];

  const hasInvalid = invalidCandidates.some(
    (candidate) => !schema.safeParse(candidate).success,
  );

  expect(hasInvalid, `${schemaLabel} should reject at least one invalid value`).toBe(true);
}

function extractSchemaTargets(exportedValue: unknown): Array<{ label: string; schema: ZodLikeSchema }> {
  if (isZodSchema(exportedValue)) {
    return [{ label: "root", schema: exportedValue }];
  }

  if (!isRouteSchemaObject(exportedValue)) {
    return [];
  }

  const routeTargets: Array<{ label: string; schema: ZodLikeSchema }> = [];
  const route = exportedValue as AnyRecord;

  for (const key of ["body", "params", "querystring", "headers"] as const) {
    const value = route[key];
    if (isZodSchema(value)) {
      routeTargets.push({ label: key, schema: value });
    }
  }

  const response = route["response"];
  if (isPlainObject(response)) {
    for (const [statusCode, responseSchema] of Object.entries(response)) {
      if (isZodSchema(responseSchema)) {
        routeTargets.push({
          label: `response:${statusCode}`,
          schema: responseSchema,
        });
      }
    }
  }

  return routeTargets;
}

describe("Zod schema coverage", () => {
  it("every zod schema module exports at least one schema object", async () => {
    const files = await collectZodSchemaFiles();
    expect(files.length).toBeGreaterThan(0);

    for (const filePath of files) {
      const module = (await import(pathToFileURL(filePath).href)) as AnyRecord;
      const entries = Object.entries(module).filter(
        ([name, exportedValue]) =>
          (name.endsWith("Schema") || name.endsWith("RouteSchema")) &&
          typeof exportedValue === "object" &&
          exportedValue !== null,
      );

      expect(entries.length, `${path.relative(SERVER_SRC_DIR, filePath)} has no *Schema exports`).toBeGreaterThan(0);

      for (const [exportName, exportedValue] of entries) {
        const ok = isZodSchema(exportedValue) || isRouteSchemaObject(exportedValue);
        expect(
          ok,
          `${path.relative(SERVER_SRC_DIR, filePath)} :: ${exportName} is not a valid Zod schema or route schema object`,
        ).toBe(true);
      }
    }
  });

  it("every zod schema has validation behavior checks (accept valid, reject invalid)", async () => {
    const files = await collectZodSchemaFiles();
    expect(files.length).toBeGreaterThan(0);

    for (const filePath of files) {
      const relPath = path.relative(SERVER_SRC_DIR, filePath);
      const module = (await import(pathToFileURL(filePath).href)) as AnyRecord;
      const entries = Object.entries(module).filter(
        ([name, exportedValue]) =>
          (name.endsWith("Schema") || name.endsWith("RouteSchema")) &&
          typeof exportedValue === "object" &&
          exportedValue !== null,
      );

      for (const [exportName, exportedValue] of entries) {
        const targets = extractSchemaTargets(exportedValue);
        expect(
          targets.length,
          `${relPath} :: ${exportName} has no testable schema targets`,
        ).toBeGreaterThan(0);

        for (const target of targets) {
          assertSchemaBehavior(
            target.schema,
            `${relPath} :: ${exportName} :: ${target.label}`,
          );
        }
      }
    }
  });
});
