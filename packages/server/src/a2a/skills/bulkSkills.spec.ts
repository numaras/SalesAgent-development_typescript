/**
 * Unit tests for A2A bulk skills handlers.
 *
 * Covers: auth required for delegated skills, get_media_buy_delivery success path,
 * optional-auth delegations (creative formats/properties), direct DB-backed skills,
 * update_performance_index, sync_creatives, list_creatives, and legacy conversion.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSelectQueue: unknown[][] = [];
const mockInsertedReviewValues: Record<string, unknown>[] = [];
const mockUpdatedCreativeValues: Record<string, unknown>[] = [];

const mockDbSelect = vi.fn(() => ({
  from: vi.fn(() => ({
    where: vi.fn(() => ({
      limit: vi.fn(async () => mockSelectQueue.shift() ?? []),
    })),
  })),
}));

const mockDbInsert = vi.fn(() => ({
  values: vi.fn(async (values: Record<string, unknown>) => {
    mockInsertedReviewValues.push(values);
    return [];
  }),
}));

const mockDbUpdate = vi.fn(() => ({
  set: vi.fn((values: Record<string, unknown>) => {
    mockUpdatedCreativeValues.push(values);
    return {
      where: vi.fn(async () => []),
    };
  }),
}));

vi.mock("../../db/client.js", () => ({
  db: {
    select: (...args: unknown[]) => mockDbSelect(...args),
    insert: (...args: unknown[]) => mockDbInsert(...args),
    update: (...args: unknown[]) => mockDbUpdate(...args),
  },
}));

const mockGetMediaBuyDelivery = vi.fn();
vi.mock("../../services/deliveryQueryService.js", () => ({
  getMediaBuyDelivery: (...args: unknown[]) => mockGetMediaBuyDelivery(...args),
}));

const mockUpdatePerformanceIndex = vi.fn();
vi.mock("../../services/performanceIndexService.js", () => ({
  updatePerformanceIndex: (...args: unknown[]) =>
    mockUpdatePerformanceIndex(...args),
}));

const mockSyncCreatives = vi.fn();
vi.mock("../../services/creativeSyncService.js", () => ({
  syncCreatives: (...args: unknown[]) => mockSyncCreatives(...args),
}));

const mockQueryCreatives = vi.fn();
vi.mock("../../services/creativeQueryService.js", () => ({
  queryCreatives: (...args: unknown[]) => mockQueryCreatives(...args),
}));

const mockListFormats = vi.fn();
vi.mock("../../services/formatService.js", () => ({
  listFormats: (...args: unknown[]) => mockListFormats(...args),
}));
const mockListAuthorizedProperties = vi.fn();
vi.mock("../../services/propertiesService.js", () => ({
  listAuthorizedProperties: (...args: unknown[]) =>
    mockListAuthorizedProperties(...args),
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

// Side-effect: register bulk skills
import "./bulkSkills.js";

const minimalContext = {
  type: "minimal" as const,
  headers: {} as Record<string, string | string[] | undefined>,
};

const toolContext = {
  contextId: "c1",
  tenantId: "tenant-1",
  principalId: "principal-1",
  toolName: "get_media_buy_delivery",
  requestTimestamp: new Date(),
  conversationHistory: [],
  metadata: {},
  testingContext: null,
  workflowId: null,
};

describe("bulk skills", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockSelectQueue.length = 0;
    mockInsertedReviewValues.length = 0;
    mockUpdatedCreativeValues.length = 0;
    vi.mocked(authExtractor.createA2AContext).mockResolvedValue(minimalContext);
    mockIsToolContext.mockReturnValue(false);
    mockGetMediaBuyDelivery.mockResolvedValue({
      reporting_period: {},
      currency: "USD",
      aggregated_totals: {},
      media_buy_deliveries: [],
    });
    mockUpdatePerformanceIndex.mockResolvedValue({
      status: "success",
      detail: "Performance index updated for 1 products",
      context: null,
    });
    mockSyncCreatives.mockResolvedValue({
      synced: 0,
      skipped: 0,
      errors: [],
      dry_run: false,
    });
    mockQueryCreatives.mockResolvedValue({ creatives: [], totalCount: 0 });
    mockResolveTenantFromHeaders.mockResolvedValue({ tenantId: "tenant-1" });
    mockListFormats.mockResolvedValue({ formats: [] });
    mockListAuthorizedProperties.mockResolvedValue({ publisher_domains: [] });
  });

  describe("get_media_buy_delivery", () => {
    it("throws ServerError when context is not ToolContext (auth required)", async () => {
      mockIsToolContext.mockReturnValue(false);

      const err = await dispatch("get_media_buy_delivery", {}, null).then(
        () => null,
        (e) => e,
      );
      expect(err).toBeInstanceOf(ServerError);
      expect((err as ServerError).message).toContain("requires authentication");
      expect(mockGetMediaBuyDelivery).not.toHaveBeenCalled();
    });

    it("calls getMediaBuyDelivery with ToolContext and returns result", async () => {
      vi.mocked(authExtractor.createA2AContext).mockResolvedValueOnce(
        toolContext,
      );
      mockIsToolContext.mockReturnValue(true);

      const result = await dispatch(
        "get_media_buy_delivery",
        { media_buy_ids: ["mb-1"] },
        "token-1",
      );

      expect(mockGetMediaBuyDelivery).toHaveBeenCalledWith(
        { tenantId: "tenant-1", principalId: "principal-1" },
        expect.objectContaining({ media_buy_ids: ["mb-1"] }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          reporting_period: {},
          currency: "USD",
          aggregated_totals: {},
          media_buy_deliveries: [],
        }),
      );
    });

    it("converts singular media_buy_id to media_buy_ids array (legacy pre-processing)", async () => {
      vi.mocked(authExtractor.createA2AContext).mockResolvedValueOnce(
        toolContext,
      );
      mockIsToolContext.mockReturnValue(true);

      await dispatch("get_media_buy_delivery", { media_buy_id: "mb-legacy" }, "token-1");

      expect(mockGetMediaBuyDelivery).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: "tenant-1" }),
        expect.objectContaining({ media_buy_ids: ["mb-legacy"] }),
      );
      const callArgs = mockGetMediaBuyDelivery.mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs).not.toHaveProperty("media_buy_id");
    });
  });

  describe("approve_creative", () => {
    it("returns validation error when creative_id is missing", async () => {
      vi.mocked(authExtractor.createA2AContext).mockResolvedValueOnce({
        ...toolContext,
        toolName: "approve_creative",
      });
      mockIsToolContext.mockReturnValue(true);

      const result = await dispatch("approve_creative", {}, "token-1");

      expect(result).toEqual({
        success: false,
        message: "creative_id is required",
        parameters_received: {},
      });
    });

    it("approves a creative owned by authenticated principal", async () => {
      vi.mocked(authExtractor.createA2AContext).mockResolvedValueOnce({
        ...toolContext,
        toolName: "approve_creative",
      });
      mockIsToolContext.mockReturnValue(true);
      mockSelectQueue.push([
        {
          creativeId: "cr-1",
          tenantId: "tenant-1",
          principalId: "principal-1",
          status: "draft",
        },
      ]);

      const result = await dispatch(
        "approve_creative",
        { creative_id: "cr-1", approved_by: "approver@example.com" },
        "token-1",
      );

      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          creative_id: "cr-1",
          status: "approved",
        }),
      );
      expect(mockInsertedReviewValues).toHaveLength(1);
      expect(mockInsertedReviewValues[0]).toEqual(
        expect.objectContaining({
          creativeId: "cr-1",
          tenantId: "tenant-1",
          reviewerEmail: "approver@example.com",
          finalDecision: "approved",
        }),
      );
      expect(mockUpdatedCreativeValues).toHaveLength(1);
      expect(mockUpdatedCreativeValues[0]).toEqual(
        expect.objectContaining({
          status: "approved",
          approvedBy: "approver@example.com",
        }),
      );
    });
  });

  describe("list_creative_formats", () => {
    it("resolves tenant from headers for minimal context and delegates", async () => {
      const result = await dispatch(
        "list_creative_formats",
        { type: "display" },
        null,
        { host: "tenant.example.com" },
      );

      expect(mockResolveTenantFromHeaders).toHaveBeenCalledWith({});
      expect(mockListFormats).toHaveBeenCalledWith(
        { tenantId: "tenant-1" },
        expect.objectContaining({ type: "display" }),
      );
      expect(result).toEqual({ formats: [] });
    });
  });

  describe("list_authorized_properties", () => {
    it("delegates with optional auth using resolved tenant", async () => {
      const result = await dispatch("list_authorized_properties", {}, null, {
        host: "tenant.example.com",
      });

      expect(mockListAuthorizedProperties).toHaveBeenCalledWith(
        { tenantId: "tenant-1" },
        expect.any(Object),
      );
      expect(result).toEqual({ publisher_domains: [] });
    });
  });

  describe("get_media_buy_status", () => {
    it("returns media buy status and readiness details", async () => {
      vi.mocked(authExtractor.createA2AContext).mockResolvedValueOnce({
        ...toolContext,
        toolName: "get_media_buy_status",
      });
      mockIsToolContext.mockReturnValue(true);
      mockSelectQueue.push([
        {
          mediaBuyId: "mb-1",
          buyerRef: "buyer-1",
          status: "draft",
          startDate: "2026-02-01",
          endDate: "2026-03-01",
          startTime: new Date("2026-02-01T00:00:00.000Z"),
          endTime: new Date("2026-03-01T00:00:00.000Z"),
          rawRequest: { packaged_products: [{ budget: 100 }] },
        },
      ]);

      const result = await dispatch(
        "get_media_buy_status",
        { media_buy_id: "mb-1" },
        "token-1",
      );

      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          media_buy_id: "mb-1",
          buyer_ref: "buyer-1",
          status: "draft",
          readiness_state: expect.any(String),
          is_ready_to_activate: expect.any(Boolean),
          blocking_issues: expect.any(Array),
        }),
      );
    });
  });

  describe("update_performance_index", () => {
    it("throws ServerError when context is not ToolContext (auth required)", async () => {
      mockIsToolContext.mockReturnValue(false);

      const err = await dispatch(
        "update_performance_index",
        {},
        null,
      ).then(() => null, (e) => e);

      expect(err).toBeInstanceOf(ServerError);
      expect((err as ServerError).message).toContain("requires authentication");
      expect(mockUpdatePerformanceIndex).not.toHaveBeenCalled();
    });

    it("delegates to updatePerformanceIndex with ToolContext", async () => {
      vi.mocked(authExtractor.createA2AContext).mockResolvedValueOnce({
        ...toolContext,
        toolName: "update_performance_index",
      });
      mockIsToolContext.mockReturnValue(true);

      const result = await dispatch(
        "update_performance_index",
        {
          media_buy_id: "mb-1",
          performance_data: [{ product_id: "p-1", performance_index: 1.05 }],
        },
        "token-1",
      );

      expect(mockUpdatePerformanceIndex).toHaveBeenCalledWith(
        { tenantId: "tenant-1", principalId: "principal-1" },
        expect.objectContaining({ media_buy_id: "mb-1" }),
      );
      expect(result).toEqual(
        expect.objectContaining({ status: "success" }),
      );
    });
  });

  describe("sync_creatives", () => {
    it("throws ServerError when context is not ToolContext (auth required)", async () => {
      mockIsToolContext.mockReturnValue(false);

      const err = await dispatch("sync_creatives", {}, null).then(
        () => null,
        (e) => e,
      );

      expect(err).toBeInstanceOf(ServerError);
      expect((err as ServerError).message).toContain("requires authentication");
      expect(mockSyncCreatives).not.toHaveBeenCalled();
    });

    it("delegates to syncCreatives with ToolContext", async () => {
      vi.mocked(authExtractor.createA2AContext).mockResolvedValueOnce({
        ...toolContext,
        toolName: "sync_creatives",
      });
      mockIsToolContext.mockReturnValue(true);
      mockSyncCreatives.mockResolvedValueOnce({
        synced: 2,
        skipped: 0,
        errors: [],
        dry_run: false,
      });

      const result = await dispatch(
        "sync_creatives",
        { creatives: [] },
        "token-1",
      );

      expect(mockSyncCreatives).toHaveBeenCalledWith(
        { tenantId: "tenant-1", principalId: "principal-1" },
        expect.objectContaining({ creatives: [] }),
      );
      expect(result).toEqual(
        expect.objectContaining({ synced: 2, dry_run: false }),
      );
    });
  });

  describe("list_creatives", () => {
    it("throws ServerError when context is not ToolContext (auth required)", async () => {
      mockIsToolContext.mockReturnValue(false);

      const err = await dispatch("list_creatives", {}, null).then(
        () => null,
        (e) => e,
      );

      expect(err).toBeInstanceOf(ServerError);
      expect((err as ServerError).message).toContain("requires authentication");
      expect(mockQueryCreatives).not.toHaveBeenCalled();
    });

    it("delegates to queryCreatives with ToolContext and returns paginated result", async () => {
      vi.mocked(authExtractor.createA2AContext).mockResolvedValueOnce({
        ...toolContext,
        toolName: "list_creatives",
      });
      mockIsToolContext.mockReturnValue(true);
      mockQueryCreatives.mockResolvedValueOnce({
        creatives: [
          {
            creative_id: "cr-1",
            name: "Creative 1",
            format_id: {
              agent_url: "https://creative.example.org",
              id: "display_300x250",
            },
            created_date: "2025-01-15T10:00:00.000Z",
            updated_date: "2025-01-16T12:00:00.000Z",
            status: "approved",
          },
        ],
        totalCount: 1,
      });

      const result = await dispatch(
        "list_creatives",
        { pagination: { limit: 10, offset: 0 } },
        "token-1",
      ) as Record<string, unknown>;

      expect(mockQueryCreatives).toHaveBeenCalledWith(
        { tenantId: "tenant-1", principalId: "principal-1" },
        expect.objectContaining({ pagination: expect.objectContaining({ limit: 10 }) }),
      );
      expect(result).toHaveProperty("creatives");
      expect(result).toHaveProperty("pagination");
      expect(result).toHaveProperty("query_summary");
      expect((result.query_summary as Record<string, unknown>).returned).toBe(1);
      expect((result.query_summary as Record<string, unknown>).total_matching).toBe(1);
    });
  });
});
