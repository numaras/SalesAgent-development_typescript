/**
 * Product ranking and brand-manifest policy service.
 *
 * Legacy equivalent: _legacy/src/core/tools/products.py
 *   - brand_manifest_policy check (require_auth / require_brand / public)
 *   - Optional AI ranking via product_ranking_prompt (stubbed; AI in later task)
 */

export type BrandManifestPolicy = "require_auth" | "require_brand" | "public";

export interface BrandManifestPolicyContext {
  /** Principal ID if authenticated; null for anonymous. */
  principalId: string | null;
  /** True if request included a brand_manifest (object or URL). */
  hasBrandManifest: boolean;
}

export interface BrandManifestPolicyResultAllowed {
  allowed: true;
}

export interface BrandManifestPolicyResultDenied {
  allowed: false;
  error: string;
}

export type BrandManifestPolicyResult =
  | BrandManifestPolicyResultAllowed
  | BrandManifestPolicyResultDenied;

const ALLOWED_POLICIES = new Set<BrandManifestPolicy>([
  "require_auth",
  "require_brand",
  "public",
]);

/**
 * Check tenant brand_manifest_policy before running get-products.
 *
 * - require_brand: deny if no brand_manifest in request.
 * - require_auth: deny if not authenticated (no principalId).
 * - public: allow all (no brand_manifest or auth required).
 *
 * @param policy Tenant setting; defaults to "require_auth" if missing.
 */
export function checkBrandManifestPolicy(
  policy: BrandManifestPolicy | string | null | undefined,
  context: BrandManifestPolicyContext,
): BrandManifestPolicyResult {
  const normalized =
    typeof policy === "string" ? policy.toLowerCase() : null;
  const effective: BrandManifestPolicy =
    normalized != null && ALLOWED_POLICIES.has(normalized as BrandManifestPolicy)
      ? (normalized as BrandManifestPolicy)
      : "require_auth";

  if (effective === "require_brand" && !context.hasBrandManifest) {
    return { allowed: false, error: "Brand manifest required by tenant policy" };
  }
  if (effective === "require_auth" && context.principalId == null) {
    return {
      allowed: false,
      error:
        "Authentication required by tenant policy. Please provide a valid token.",
    };
  }
  return { allowed: true };
}

/**
 * Rank products by relevance to the brief (stub).
 *
 * Legacy: AI ranking via product_ranking_prompt and ranking_agent.
 * When tenant has product_ranking_prompt and AI is enabled, products are
 * scored and sorted by relevance; low scores are filtered out.
 *
 * This implementation returns products unchanged. AI ranking can be added
 * in a follow-up (e.g. ADCP-006-D extension or separate task).
 */
export function rankProductsByBrief<T>(
  _tenantId: string,
  brief: string,
  productRankingPrompt: string | null | undefined,
  products: T[],
): T[] {
  if (!productRankingPrompt || !brief.trim() || products.length <= 1) {
    return products;
  }

  const tokens = tokenize(brief);
  if (tokens.length === 0) {
    return products;
  }

  const scored = products.map((product, index) => {
    const searchable = extractSearchText(product);
    const score = tokens.reduce(
      (acc, token) => (searchable.includes(token) ? acc + 1 : acc),
      0,
    );
    return { product, score, index };
  });

  const bestScore = Math.max(...scored.map((item) => item.score));
  if (bestScore === 0) {
    return products;
  }

  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((item) => item.product);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length >= 3);
}

function extractSearchText(product: unknown): string {
  if (product == null || typeof product !== "object") {
    return "";
  }

  const record = product as Record<string, unknown>;
  const chunks: string[] = [];

  if (typeof record["name"] === "string") {
    chunks.push(record["name"]);
  }
  if (typeof record["description"] === "string") {
    chunks.push(record["description"]);
  }

  const card = record["product_card"];
  if (card != null && typeof card === "object") {
    const cardRecord = card as Record<string, unknown>;
    if (typeof cardRecord["title"] === "string") {
      chunks.push(cardRecord["title"]);
    }
    if (typeof cardRecord["description"] === "string") {
      chunks.push(cardRecord["description"]);
    }
  }

  const formatIds = record["format_ids"];
  if (Array.isArray(formatIds)) {
    for (const entry of formatIds) {
      if (entry != null && typeof entry === "object") {
        const formatRecord = entry as Record<string, unknown>;
        if (typeof formatRecord["id"] === "string") {
          chunks.push(formatRecord["id"]);
        }
      }
    }
  }

  return chunks.join(" ").toLowerCase();
}
