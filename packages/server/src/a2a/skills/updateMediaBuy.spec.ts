/**
 * Unit tests for A2A update_media_buy skill.
 *
 * Covers: auth required, missing media_buy_id/buyer_ref, legacy updates.packages, success path.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUpdateMediaBuy = vi.fn();
vi.mock("../../services/mediaBuyUpdateService.js", () => ({
  updateMediaBuy: (...args: unknown[]) => mockUpdateMediaBuy(...args),
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

// Side-effect: register update_media_buy skill
import "./updateMediaBuy.js";

const minimalContext = {
  type: "minimal" as const,
  headers: {} as Record<string, string | string[] | undefined>,
};

const toolContext = {
  contextId: "c1",
  tenantId: "tenant-1",
  principalId: "principal-1",
  toolName: "update_media_buy",
  requestTimestamp: new Date(),
  conversationHistory: [],
  metadata: {},
  testingContext: null,
  workflowId: null,
};

describe("update_media_buy skill", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(authExtractor.createA2AContext).mockResolvedValue(minimalContext);
    mockIsToolContext.mockReturnValue(false);
    mockUpdateMediaBuy.mockResolvedValue({
      media_buy_id: "mb-1",
      affected_packages: [{ package_id: "pkg-1", status: "active" }],
    });
  });

  it("throws ServerError when context is not ToolContext (auth required)", async () => {
    mockIsToolContext.mockReturnValue(false);

    const err = await dispatch(
      "update_media_buy",
      { media_buy_id: "mb-1" },
      null,
    ).then(() => null, (e) => e);
    expect(err).toBeInstanceOf(ServerError);
    expect((err as ServerError).message).toContain("requires authentication");
    expect(mockUpdateMediaBuy).not.toHaveBeenCalled();
  });

  it("throws ServerError when neither media_buy_id nor buyer_ref provided", async () => {
    vi.mocked(authExtractor.createA2AContext).mockResolvedValueOnce(toolContext);
    mockIsToolContext.mockReturnValue(true);

    const err = await dispatch(
      "update_media_buy",
      { paused: false },
      "token-1",
    ).then(() => null, (e) => e);

    expect(err).toBeInstanceOf(ServerError);
    expect((err as ServerError).message).toContain(
      "One of media_buy_id or buyer_ref is required",
    );
    expect(mockUpdateMediaBuy).not.toHaveBeenCalled();
  });

  it("maps legacy updates.packages to packages and calls updateMediaBuy", async () => {
    vi.mocked(authExtractor.createA2AContext).mockResolvedValueOnce(toolContext);
    mockIsToolContext.mockReturnValue(true);

    await dispatch(
      "update_media_buy",
      {
        media_buy_id: "mb-1",
        updates: { packages: [{ package_id: "pkg-1", paused: true }] },
      },
      "token-1",
    );

    expect(mockUpdateMediaBuy).toHaveBeenCalledTimes(1);
    const [, request] = mockUpdateMediaBuy.mock.calls[0];
    expect(request).toHaveProperty("packages", [
      { package_id: "pkg-1", paused: true },
    ]);
    expect(request).not.toHaveProperty("updates");
  });

  it("calls updateMediaBuy with ToolContext and returns result", async () => {
    vi.mocked(authExtractor.createA2AContext).mockResolvedValueOnce(toolContext);
    mockIsToolContext.mockReturnValue(true);

    const result = await dispatch(
      "update_media_buy",
      { media_buy_id: "mb-1", paused: false },
      "token-1",
    );

    expect(mockUpdateMediaBuy).toHaveBeenCalledWith(
      { tenantId: "tenant-1", principalId: "principal-1" },
      expect.objectContaining({
        media_buy_id: "mb-1",
        paused: false,
      }),
    );
    expect(result).toEqual({
      media_buy_id: "mb-1",
      affected_packages: [{ package_id: "pkg-1", status: "active" }],
    });
  });
});
