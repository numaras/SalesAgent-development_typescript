/**
 * Unit tests for A2A dispatcher.
 *
 * Unknown skill → ServerError; known skill → correct handler called.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./authExtractor.js", () => ({
  createA2AContext: vi.fn().mockResolvedValue({
    type: "minimal",
    headers: {} as Record<string, string | string[] | undefined>,
  }),
}));

import {
  dispatch,
  METHOD_NOT_FOUND_CODE,
  registerSkill,
  ServerError,
} from "./dispatcher.js";

describe("dispatch", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("throws ServerError with METHOD_NOT_FOUND_CODE for unknown skill", async () => {
    await expect(dispatch("unknown_skill", {}, null)).rejects.toThrow(
      ServerError,
    );
    const err = await dispatch("unknown_skill", {}, null).then(
      () => null,
      (e) => e,
    );
    expect(err).toBeInstanceOf(ServerError);
    expect((err as ServerError).code).toBe(METHOD_NOT_FOUND_CODE);
    expect((err as ServerError).message).toContain("Unknown skill");
    expect((err as ServerError).message).toContain("unknown_skill");
  });

  it("calls registered handler and returns its result for known skill", async () => {
    const handler = vi.fn().mockResolvedValue({ products: [] });
    registerSkill("get_products", handler);

    const result = await dispatch(
      "get_products",
      { brief: "display" },
      "token-1",
    );

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledTimes(1);
    expect((handler as ReturnType<typeof vi.fn>).mock.calls[0][0]).toEqual({
      brief: "display",
    });
    expect((handler as ReturnType<typeof vi.fn>).mock.calls[0][1]).toBe(
      "token-1",
    );
    expect((handler as ReturnType<typeof vi.fn>).mock.calls[0]).toHaveLength(3);
    expect(result).toEqual({ products: [] });
  });
});
