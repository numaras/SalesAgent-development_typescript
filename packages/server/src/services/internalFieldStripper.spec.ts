/**
 * Unit tests for internalFieldStripper.
 *
 * Ensures workflow_step_id and other internal keys are absent from output;
 * other fields are preserved.
 */
import { describe, expect, it } from "vitest";

import {
  DEFAULT_INTERNAL_KEYS,
  stripInternalFields,
} from "./internalFieldStripper.js";

describe("stripInternalFields", () => {
  it("removes workflow_step_id from object", () => {
    const input = {
      media_buy_id: "mb_1",
      workflow_step_id: "step_abc",
      packages: [],
    };
    const out = stripInternalFields(input);
    expect(out).not.toHaveProperty("workflow_step_id");
    expect(out).toHaveProperty("media_buy_id", "mb_1");
    expect(out).toHaveProperty("packages", []);
  });

  it("removes all DEFAULT_INTERNAL_KEYS from object", () => {
    const input: Record<string, unknown> = {
      a: 1,
      ...Object.fromEntries(DEFAULT_INTERNAL_KEYS.map((k) => [k, "x"])),
    };
    const out = stripInternalFields(input);
    expect(out).toEqual({ a: 1 });
    for (const k of DEFAULT_INTERNAL_KEYS) {
      expect(out).not.toHaveProperty(k);
    }
  });

  it("preserves other fields", () => {
    const input = {
      media_buy_id: "mb_1",
      buyer_ref: "ref1",
      packages: [{ package_id: "pkg_1", status: "draft" }],
    };
    const out = stripInternalFields(input);
    expect(out).toEqual(input);
  });

  it("strips internal keys from nested objects", () => {
    const input = {
      packages: [
        { package_id: "p1", status: "draft", platform_line_item_id: "li_1" },
      ],
    };
    const out = stripInternalFields(input);
    expect(out).toHaveProperty("packages");
    expect((out as { packages: unknown[] }).packages[0]).not.toHaveProperty(
      "platform_line_item_id",
    );
    expect((out as { packages: unknown[] }).packages[0]).toHaveProperty(
      "package_id",
      "p1",
    );
  });

  it("does not mutate the original object", () => {
    const input = { a: 1, workflow_step_id: "step_1" };
    const out = stripInternalFields(input);
    expect(input).toHaveProperty("workflow_step_id", "step_1");
    expect(out).not.toHaveProperty("workflow_step_id");
  });
});
