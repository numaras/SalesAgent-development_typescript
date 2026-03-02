import { describe, expect, it } from "vitest";

import {
  checkBrandManifestPolicy,
  rankProductsByBrief,
} from "./productRankingService.js";

describe("checkBrandManifestPolicy", () => {
  it("defaults unknown policy to require_auth", () => {
    const result = checkBrandManifestPolicy("unexpected", {
      principalId: null,
      hasBrandManifest: false,
    });

    expect(result).toEqual({
      allowed: false,
      error:
        "Authentication required by tenant policy. Please provide a valid token.",
    });
  });

  it("requires brand manifest for require_brand", () => {
    const result = checkBrandManifestPolicy("require_brand", {
      principalId: "p1",
      hasBrandManifest: false,
    });

    expect(result).toEqual({
      allowed: false,
      error: "Brand manifest required by tenant policy",
    });
  });
});

describe("rankProductsByBrief", () => {
  it("keeps order when prompt is not configured", () => {
    const products = [{ name: "Video Bundle" }, { name: "Display Bundle" }];
    const ranked = rankProductsByBrief("tenant", "video campaign", null, products);
    expect(ranked).toEqual(products);
  });

  it("ranks matching products first when prompt is configured", () => {
    const products = [
      { name: "Display Bundle", description: "Premium display inventory" },
      { name: "Sports Video Package", description: "Streaming and CTV video" },
    ];

    const ranked = rankProductsByBrief(
      "tenant",
      "Need sports video reach",
      "rank by relevance",
      products,
    );

    expect(ranked.map((p) => p.name)).toEqual(["Sports Video Package"]);
  });
});
