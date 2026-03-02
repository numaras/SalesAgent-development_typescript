/**
 * Recursively serialize a value to a JSON-serializable form.
 *
 * Converts Date to ISO string; recursively processes arrays and plain objects;
 * objects with toJSON() are called and the result is then serialized.
 * Legacy equivalent: _legacy Pydantic model_dump() for nested models.
 */
export type JsonSerializable =
  | string
  | number
  | boolean
  | null
  | JsonSerializable[]
  | { [key: string]: JsonSerializable };

/**
 * Recursively serialize a value for JSON output.
 *
 * - null / undefined: returned as-is (undefined is omitted when in object).
 * - Primitives (string, number, boolean): returned as-is.
 * - Date: converted to ISO string.
 * - Array: each element serialized.
 * - Object with toJSON: result of toJSON() is then serialized.
 * - Plain object: each value serialized (keys preserved).
 * - Other (e.g. class instance without toJSON): treated as plain object (enumerable keys).
 */
export function serializeNested(value: unknown): JsonSerializable | undefined {
  if (value === null) {
    return null;
  }

  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeNested(item)) as JsonSerializable[];
  }

  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    if (typeof obj.toJSON === "function") {
      return serializeNested(obj.toJSON()) as JsonSerializable;
    }
    const out: { [key: string]: JsonSerializable } = {};
    for (const [k, v] of Object.entries(obj)) {
      const serialized = serializeNested(v);
      if (serialized !== undefined) {
        out[k] = serialized;
      }
    }
    return out;
  }

  return undefined;
}
