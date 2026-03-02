/**
 * V2.x backward-compatibility for get-products responses.
 *
 * Legacy equivalent: _legacy/src/core/product_conversion.py
 *   needs_v2_compat(), add_v2_compat_to_pricing_options(), add_v2_compat_to_products()
 *
 * V3 changes that need v2 compat:
 * - is_fixed removed → add is_fixed: true if fixed_price present, else false
 * - rate renamed to fixed_price → add rate as copy of fixed_price when present
 * - floor_price top-level → add price_guidance.floor when floor_price present
 */

const V3_MAJOR = 3;

/**
 * Parse a semantic version string and return [major, minor, patch] or null.
 * Supports "3", "3.0", "3.0.0", "2.16.0".
 */
function parseSemver(version: string): [number, number, number] | null {
  const s = version.trim();
  if (!s) return null;
  const parts = s.split(".");
  const major = parseInt(parts[0] ?? "0", 10);
  const minor = parseInt(parts[1] ?? "0", 10);
  const patch = parseInt(parts[2] ?? "0", 10);
  if (Number.isNaN(major)) return null;
  return [major, minor, patch];
}

/**
 * Check if the client needs v2 backward-compat fields in responses.
 *
 * V2 compat fields (is_fixed, rate, price_guidance.floor) are only needed
 * for pre-3.0 clients. V3+ clients get clean responses per AdCP v3 spec.
 *
 * Uses semantic comparison: adcp_version < "3.0.0" → needs compat.
 * Unparseable or null/undefined → default to true (safe for legacy clients).
 */
export function needsV2Compat(
  adcpVersion: string | null | undefined,
): boolean {
  if (adcpVersion == null || adcpVersion === "") {
    return true;
  }
  const v = parseSemver(adcpVersion);
  if (v == null) {
    return true;
  }
  return v[0] < V3_MAJOR;
}

/**
 * Add v2.x backward-compat fields to pricing_options in a single product dict.
 *
 * - is_fixed: true if fixed_price is present, false otherwise
 * - rate: copy of fixed_price when present (v2 field name)
 * - price_guidance.floor: copy of floor_price when present
 *
 * Mutates the given object and returns it.
 */
export function addV2CompatToPricingOptions(
  productDict: Record<string, unknown>,
): Record<string, unknown> {
  const options = productDict["pricing_options"];
  if (!Array.isArray(options)) {
    return productDict;
  }

  for (const po of options) {
    if (typeof po !== "object" || po === null) continue;
    const opt = po as Record<string, unknown>;
    const fixedPrice = opt["fixed_price"];
    opt["is_fixed"] = fixedPrice != null;
    if (fixedPrice != null) {
      opt["rate"] = fixedPrice;
    }
    const floorPrice = opt["floor_price"];
    if (floorPrice != null) {
      let guidance = opt["price_guidance"] as Record<string, unknown> | undefined;
      if (guidance == null || typeof guidance !== "object") {
        guidance = {};
        opt["price_guidance"] = guidance;
      }
      (guidance as Record<string, unknown>)["floor"] = floorPrice;
    }
  }

  return productDict;
}

/**
 * Add v2.x backward-compat fields to a list of serialized product dicts.
 */
export function addV2CompatToProducts(
  products: Record<string, unknown>[],
): Record<string, unknown>[] {
  return products.map(addV2CompatToPricingOptions);
}
