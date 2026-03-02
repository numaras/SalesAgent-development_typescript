/**
 * Unit tests for A2A get_products skill.
 *
 * Covers: invalid params, missing brief/brand_manifest, success with brief,
 * tenant from MinimalContext vs ToolContext.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQueryProducts = vi.fn();
vi.mock("../../services/productQueryService.js", () => ({
  queryProducts: (...args: unknown[]) => mockQueryProducts(...args),
}));

const mockResolveTenantFromHeaders = vi.fn();
vi.mock("../../auth/resolveTenantFromHost.js", () => ({
  resolveTenantFromHeaders: (...args: unknown[]) =>
    mockResolveTenantFromHeaders(...args),
}));

const mockIsToolContext = vi.fn();
vi.mock("../authExtractor.js", () => ({
  isToolContext: (ctx: unknown) => mockIsToolContext(ctx),
  createA2AContext: vi.fn().mockResolvedValue({
    type: "minimal",
    headers: {} as Record<string, string | string[] | undefined>,
  }),
}));

import * as authExtractor from "../authExtractor.js";
import { dispatch, ServerError } from "../dispatcher.js";

// Side-effect: register get_products skill
import "./getProducts.js";

const minimalContext = {
  type: "minimal" as const,
  headers: {} as Record<string, string | string[] | undefined>,
};

describe("get_products skill", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(authExtractor.createA2AContext).mockResolvedValue(minimalContext);
    mockIsToolContext.mockReturnValue(false);
    mockResolveTenantFromHeaders.mockResolvedValue({ tenantId: "default" });
    mockQueryProducts.mockResolvedValue({ products: [] });
  });

  it("throws ServerError for invalid params", async () => {
    const err = await dispatch(
      "get_products",
      { brief: 123 },
      null,
    ).then(() => null, (e) => e);
    expect(err).toBeInstanceOf(ServerError);
    expect((err as ServerError).message).toContain("Invalid get_products params");
    expect(mockQueryProducts).not.toHaveBeenCalled();
  });

  it("throws ServerError when neither brief nor brand_manifest provided", async () => {
    const err = await dispatch("get_products", {}, null).then(
      () => null,
      (e) => e,
    );
    expect(err).toBeInstanceOf(ServerError);
    expect((err as ServerError).message).toContain(
      "at least one of: brief, brand_manifest",
    );
    expect(mockQueryProducts).not.toHaveBeenCalled();
  });

  it("calls queryProducts and returns result when brief is provided", async () => {
    const products = [
      {
        product_id: "p1",
        name: "Display",
        format_ids: [],
        delivery_type: "guaranteed" as const,
        publisher_properties: [{ selection_type: "by_tag" as const, property_tags: ["all_inventory"] }],
        pricing_options: [],
        is_custom: false,
      },
    ];
    mockQueryProducts.mockResolvedValue({ products });

    const result = await dispatch(
      "get_products",
      { brief: "display ads" },
      null,
    );

    expect(mockResolveTenantFromHeaders).toHaveBeenCalledOnce();
    expect(mockQueryProducts).toHaveBeenCalledWith(
      { tenantId: "default" },
      expect.objectContaining({ brief: "display ads" }),
    );
    expect(result).toEqual({ products });
  });

  it("uses tenantId from ToolContext when isToolContext is true", async () => {
    const authExtractor = await import("../authExtractor.js");
    vi.mocked(authExtractor.createA2AContext).mockResolvedValueOnce({
      contextId: "c1",
      tenantId: "tenant-42",
      principalId: "principal-1",
      toolName: "get_products",
      requestTimestamp: new Date(),
      conversationHistory: [],
      metadata: {},
      testingContext: null,
      workflowId: null,
    });
    mockIsToolContext.mockReturnValue(true);

    await dispatch("get_products", { brief: "video" }, "token-1");

    expect(mockQueryProducts).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "tenant-42" }),
      expect.any(Object),
    );
  });
});
