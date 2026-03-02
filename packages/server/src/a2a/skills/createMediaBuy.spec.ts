/**
 * Unit tests for A2A create_media_buy skill.
 *
 * Covers: auth required, missing required params, custom_targeting alias, success path.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateMediaBuy = vi.fn();
vi.mock("../../services/mediaBuyCreateService.js", () => ({
  createMediaBuy: (...args: unknown[]) => mockCreateMediaBuy(...args),
}));

vi.mock("../../services/internalFieldStripper.js", () => ({
  stripInternalFields: (x: unknown) => x,
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

// Side-effect: register create_media_buy skill
import "./createMediaBuy.js";

const minimalContext = {
  type: "minimal" as const,
  headers: {} as Record<string, string | string[] | undefined>,
};

const toolContext = {
  contextId: "c1",
  tenantId: "tenant-1",
  principalId: "principal-1",
  toolName: "create_media_buy",
  requestTimestamp: new Date(),
  conversationHistory: [],
  metadata: {},
  testingContext: null,
  workflowId: null,
};

const validParams = {
  brand_manifest: { name: "Acme" },
  buyer_ref: "A2A-principal-1",
  packages: [
    {
      product_id: "prod-1",
      budget: { total: 100, currency: "USD" },
      pricing_option_id: "opt-1",
    },
  ],
  start_time: "asap",
  end_time: "2025-12-31T23:59:59Z",
};

describe("create_media_buy skill", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(authExtractor.createA2AContext).mockResolvedValue(minimalContext);
    mockIsToolContext.mockReturnValue(false);
    mockCreateMediaBuy.mockResolvedValue({
      media_buy_id: "mb-1",
      buyer_ref: validParams.buyer_ref,
      packages: validParams.packages,
    });
  });

  it("throws ServerError when context is not ToolContext (auth required)", async () => {
    mockIsToolContext.mockReturnValue(false);

    const err = await dispatch("create_media_buy", validParams, null).then(
      () => null,
      (e) => e,
    );
    expect(err).toBeInstanceOf(ServerError);
    expect((err as ServerError).message).toContain("requires authentication");
    expect(mockCreateMediaBuy).not.toHaveBeenCalled();
  });

  it("throws ServerError when required params are missing", async () => {
    vi.mocked(authExtractor.createA2AContext).mockResolvedValueOnce(toolContext);
    mockIsToolContext.mockReturnValue(true);

    const err = await dispatch(
      "create_media_buy",
      { brand_manifest: { name: "X" }, start_time: "asap", end_time: "2025-12-31T00:00:00Z" },
      "token-1",
    ).then(() => null, (e) => e);

    expect(err).toBeInstanceOf(ServerError);
    expect((err as ServerError).message).toContain("Missing required AdCP parameters");
    expect((err as ServerError).message).toContain("packages");
    expect(mockCreateMediaBuy).not.toHaveBeenCalled();
  });

  it("maps custom_targeting to targeting_overlay and calls createMediaBuy", async () => {
    vi.mocked(authExtractor.createA2AContext).mockResolvedValueOnce(toolContext);
    mockIsToolContext.mockReturnValue(true);

    await dispatch(
      "create_media_buy",
      {
        ...validParams,
        custom_targeting: { geo: "US" },
      },
      "token-1",
    );

    expect(mockCreateMediaBuy).toHaveBeenCalledTimes(1);
    const [, request] = mockCreateMediaBuy.mock.calls[0];
    expect(request).toHaveProperty("targeting_overlay", { geo: "US" });
    expect(request).not.toHaveProperty("custom_targeting");
  });

  it("calls createMediaBuy with ToolContext and returns result", async () => {
    vi.mocked(authExtractor.createA2AContext).mockResolvedValueOnce(toolContext);
    mockIsToolContext.mockReturnValue(true);

    const result = await dispatch(
      "create_media_buy",
      validParams,
      "token-1",
    );

    expect(mockCreateMediaBuy).toHaveBeenCalledWith(
      { tenantId: "tenant-1", principalId: "principal-1" },
      expect.objectContaining({
        brand_manifest: validParams.brand_manifest,
        buyer_ref: "A2A-principal-1",
        packages: validParams.packages,
        start_time: "asap",
        end_time: validParams.end_time,
      }),
    );
    expect(result).toEqual({
      media_buy_id: "mb-1",
      buyer_ref: validParams.buyer_ref,
      packages: validParams.packages,
    });
  });
});
