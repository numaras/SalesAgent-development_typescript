/**
 * Unit tests for A2A get_adcp_capabilities skill.
 *
 * Covers: minimal context (no tenant), tenant from headers, tenant from ToolContext.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetAdcpCapabilities = vi.fn();
vi.mock("../../services/capabilitiesService.js", () => ({
  getAdcpCapabilities: (...args: unknown[]) => mockGetAdcpCapabilities(...args),
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
import { dispatch } from "../dispatcher.js";

// Side-effect: register get_adcp_capabilities skill
import "./getAdcpCapabilities.js";

const minimalContext = {
  type: "minimal" as const,
  headers: {} as Record<string, string | string[] | undefined>,
};

const minimalResponse = {
  adcp: { major_versions: [{ root: 3 }] },
  supported_protocols: ["media_buy"] as const,
};

describe("get_adcp_capabilities skill", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(authExtractor.createA2AContext).mockResolvedValue(minimalContext);
    mockIsToolContext.mockReturnValue(false);
    mockResolveTenantFromHeaders.mockResolvedValue(null);
    mockGetAdcpCapabilities.mockImplementation((ctx: unknown) => {
      if (ctx == null) return { ...minimalResponse };
      return {
        ...minimalResponse,
        media_buy: { portfolio: { description: "Full capabilities" } },
      };
    });
  });

  it("returns minimal capabilities when no tenant (minimal context, no tenant from headers)", async () => {
    mockResolveTenantFromHeaders.mockResolvedValue(null);

    const result = await dispatch("get_adcp_capabilities", {}, null);

    expect(mockGetAdcpCapabilities).toHaveBeenCalledWith(null);
    expect(result).toEqual(
      expect.objectContaining({
        adcp: { major_versions: [{ root: 3 }] },
        supported_protocols: ["media_buy"],
      }),
    );
  });

  it("passes tenant context when tenant resolved from headers", async () => {
    mockResolveTenantFromHeaders.mockResolvedValue({
      tenantId: "tenant-1",
      name: "Acme",
    } as { tenantId: string; name: string });

    await dispatch("get_adcp_capabilities", {}, null);

    expect(mockGetAdcpCapabilities).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      tenantName: "Acme",
    });
  });

  it("uses tenantId from ToolContext when isToolContext is true", async () => {
    vi.mocked(authExtractor.createA2AContext).mockResolvedValueOnce({
      contextId: "c1",
      tenantId: "tenant-42",
      principalId: "principal-1",
      toolName: "get_adcp_capabilities",
      requestTimestamp: new Date(),
      conversationHistory: [],
      metadata: {},
      testingContext: null,
      workflowId: null,
    });
    mockIsToolContext.mockReturnValue(true);

    await dispatch("get_adcp_capabilities", {}, "token-1");

    expect(mockGetAdcpCapabilities).toHaveBeenCalledWith({
      tenantId: "tenant-42",
      tenantName: undefined,
    });
    expect(mockResolveTenantFromHeaders).not.toHaveBeenCalled();
  });
});
