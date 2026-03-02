/**
 * Unit tests for v2CompatTransform (needsV2Compat, addV2CompatToPricingOptions, addV2CompatToProducts).
 *
 * Legacy equivalent: _legacy/tests/unit/test_product_conversion.py (v2 compat behaviour)
 */
import { describe, expect, it } from "vitest";

import {
  addV2CompatToPricingOptions,
  addV2CompatToProducts,
  needsV2Compat,
} from "./v2CompatTransform.js";

describe("needsV2Compat", () => {
  it("returns true when adcp_version is null or undefined", () => {
    expect(needsV2Compat(null)).toBe(true);
    expect(needsV2Compat(undefined)).toBe(true);
  });

  it("returns true when adcp_version is empty string", () => {
    expect(needsV2Compat("")).toBe(true);
  });

  it("returns true when version is less than 3 (semantic)", () => {
    expect(needsV2Compat("2.16.0")).toBe(true);
    expect(needsV2Compat("2.0")).toBe(true);
    expect(needsV2Compat("1.0.0")).toBe(true);
    expect(needsV2Compat("0.9")).toBe(true);
  });

  it("returns false when version is 3 or higher", () => {
    expect(needsV2Compat("3")).toBe(false);
    expect(needsV2Compat("3.0")).toBe(false);
    expect(needsV2Compat("3.0.0")).toBe(false);
    expect(needsV2Compat("4.0.0")).toBe(false);
  });

  it("returns true for unparseable version (safe default)", () => {
    expect(needsV2Compat("not-a-version")).toBe(true);
    expect(needsV2Compat("  ")).toBe(true);
  });
});

describe("addV2CompatToPricingOptions", () => {
  it("adds is_fixed and rate when fixed_price is present", () => {
    const product = {
      product_id: "p1",
      pricing_options: [
        {
          pricing_option_id: "cpm_usd",
          pricing_model: "cpm",
          currency: "USD",
          fixed_price: 5.0,
        },
      ],
    };
    const result = addV2CompatToPricingOptions(product);

    expect(result).toBe(product);
    const po = (result.pricing_options as Record<string, unknown>[])[0];
    expect(po?.is_fixed).toBe(true);
    expect(po?.rate).toBe(5.0);
  });

  it("sets is_fixed false and adds price_guidance.floor when floor_price present", () => {
    const product = {
      product_id: "p2",
      pricing_options: [
        {
          pricing_option_id: "cpm_auction",
          pricing_model: "cpm",
          currency: "USD",
          floor_price: 1.5,
          price_guidance: { p50: 2 },
        },
      ],
    };
    addV2CompatToPricingOptions(product);

    const po = (product.pricing_options as Record<string, unknown>[])[0];
    expect(po?.is_fixed).toBe(false);
    expect((po?.price_guidance as Record<string, unknown>)?.floor).toBe(1.5);
    expect((po?.price_guidance as Record<string, unknown>)?.p50).toBe(2);
  });

  it("creates price_guidance when floor_price present and price_guidance missing", () => {
    const product = {
      product_id: "p3",
      pricing_options: [
        { pricing_option_id: "x", pricing_model: "cpm", currency: "USD", floor_price: 2 },
      ],
    };
    addV2CompatToPricingOptions(product);

    const po = (product.pricing_options as Record<string, unknown>[])[0];
    expect(po?.price_guidance).toEqual({ floor: 2 });
  });

  it("leaves product unchanged when pricing_options is missing", () => {
    const product = { product_id: "p4" };
    const result = addV2CompatToPricingOptions(product);
    expect(result).toBe(product);
    expect(result).toEqual({ product_id: "p4" });
  });
});

describe("addV2CompatToProducts", () => {
  it("applies v2 compat to each product in the list", () => {
    const products = [
      {
        product_id: "a",
        pricing_options: [{ fixed_price: 10 }],
      },
      {
        product_id: "b",
        pricing_options: [{ floor_price: 1 }],
      },
    ];
    const result = addV2CompatToProducts(products);

    expect(result).toHaveLength(2);
    expect((result[0]?.pricing_options as Record<string, unknown>[])[0]).toMatchObject({
      is_fixed: true,
      rate: 10,
    });
    expect((result[1]?.pricing_options as Record<string, unknown>[])[0]).toMatchObject({
      is_fixed: false,
    });
    expect(
      ((result[1]?.pricing_options as Record<string, unknown>[])[0]?.price_guidance as Record<string, unknown>)?.floor,
    ).toBe(1);
  });
});
