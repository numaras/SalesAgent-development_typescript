/**
 * Unit tests for serializeNested.
 *
 * Covers: null, undefined, primitives, Date, arrays, plain objects, toJSON.
 */
import { describe, expect, it } from "vitest";

import { serializeNested } from "./serializeNested.js";

describe("serializeNested", () => {
  it("returns null for null", () => {
    expect(serializeNested(null)).toBe(null);
  });

  it("returns undefined for undefined", () => {
    expect(serializeNested(undefined)).toBe(undefined);
  });

  it("returns primitives as-is", () => {
    expect(serializeNested("a")).toBe("a");
    expect(serializeNested(42)).toBe(42);
    expect(serializeNested(true)).toBe(true);
    expect(serializeNested(false)).toBe(false);
  });

  it("converts Date to ISO string", () => {
    const d = new Date("2025-06-15T12:00:00.000Z");
    expect(serializeNested(d)).toBe("2025-06-15T12:00:00.000Z");
  });

  it("recursively serializes arrays", () => {
    expect(serializeNested([1, "x", null])).toEqual([1, "x", null]);
    const d = new Date("2025-01-01T00:00:00.000Z");
    expect(serializeNested([d, 1])).toEqual(["2025-01-01T00:00:00.000Z", 1]);
  });

  it("recursively serializes plain objects", () => {
    expect(serializeNested({ a: 1, b: "x" })).toEqual({ a: 1, b: "x" });
    const d = new Date("2025-01-01T00:00:00.000Z");
    expect(serializeNested({ date: d, n: 2 })).toEqual({
      date: "2025-01-01T00:00:00.000Z",
      n: 2,
    });
  });

  it("omits undefined values in objects", () => {
    expect(serializeNested({ a: 1, b: undefined, c: null })).toEqual({
      a: 1,
      c: null,
    });
  });

  it("calls toJSON when present and serializes result", () => {
    const obj = {
      value: 1,
      toJSON() {
        return { serialized: true, value: this.value };
      },
    };
    expect(serializeNested(obj)).toEqual({ serialized: true, value: 1 });
  });

  it("serializes nested objects and arrays", () => {
    const d = new Date("2025-06-01T00:00:00.000Z");
    const input = {
      level: 1,
      nested: {
        level: 2,
        date: d,
        arr: [d, { inner: "ok" }],
      },
    };
    expect(serializeNested(input)).toEqual({
      level: 1,
      nested: {
        level: 2,
        date: "2025-06-01T00:00:00.000Z",
        arr: ["2025-06-01T00:00:00.000Z", { inner: "ok" }],
      },
    });
  });
});
