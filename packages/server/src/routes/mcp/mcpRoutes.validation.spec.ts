import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyPluginAsync } from "fastify";

import { buildApp } from "../../app.js";
import completeTaskRoute from "./completeTask.js";
import createMediaBuyRoute from "./createMediaBuy.js";
import getAdcpCapabilitiesRoute from "./getAdcpCapabilities.js";
import getMediaBuyDeliveryRoute from "./getMediaBuyDelivery.js";
import getProductsRoute from "./getProducts.js";
import getTaskRoute from "./getTask.js";
import listAuthorizedPropertiesRoute from "./listAuthorizedProperties.js";
import listCreativeFormatsRoute from "./listCreativeFormats.js";
import listCreativesRoute from "./listCreatives.js";
import listTasksRoute from "./listTasks.js";
import syncCreativesRoute from "./syncCreatives.js";
import updateMediaBuyRoute from "./updateMediaBuy.js";
import updatePerformanceIndexRoute from "./updatePerformanceIndex.js";

const mockResolveTenantFromHeaders = vi.fn();
vi.mock("../../auth/resolveTenantFromHost.js", () => ({
  resolveTenantFromHeaders: (...args: unknown[]) =>
    mockResolveTenantFromHeaders(...args),
}));

const mockQueryProducts = vi.fn();
vi.mock("../../services/productQueryService.js", () => ({
  queryProducts: (...args: unknown[]) => mockQueryProducts(...args),
}));

const mockCheckBrandManifestPolicy = vi.fn();
const mockRankProductsByBrief = vi.fn();
vi.mock("../../services/productRankingService.js", () => ({
  checkBrandManifestPolicy: (...args: unknown[]) =>
    mockCheckBrandManifestPolicy(...args),
  rankProductsByBrief: (...args: unknown[]) => mockRankProductsByBrief(...args),
}));

const mockNeedsV2Compat = vi.fn();
const mockAddV2CompatToProducts = vi.fn();
vi.mock("../../services/v2CompatTransform.js", () => ({
  needsV2Compat: (...args: unknown[]) => mockNeedsV2Compat(...args),
  addV2CompatToProducts: (...args: unknown[]) => mockAddV2CompatToProducts(...args),
}));

const mockCreateMediaBuy = vi.fn();
vi.mock("../../services/mediaBuyCreateService.js", () => ({
  createMediaBuy: (...args: unknown[]) => mockCreateMediaBuy(...args),
}));

const mockUpdateMediaBuy = vi.fn();
vi.mock("../../services/mediaBuyUpdateService.js", () => ({
  updateMediaBuy: (...args: unknown[]) => mockUpdateMediaBuy(...args),
}));

const mockStripInternalFields = vi.fn();
vi.mock("../../services/internalFieldStripper.js", () => ({
  stripInternalFields: (...args: unknown[]) => mockStripInternalFields(...args),
}));

const mockGetMediaBuyDelivery = vi.fn();
vi.mock("../../services/deliveryQueryService.js", () => ({
  getMediaBuyDelivery: (...args: unknown[]) => mockGetMediaBuyDelivery(...args),
}));

const mockQueryCreatives = vi.fn();
vi.mock("../../services/creativeQueryService.js", () => ({
  queryCreatives: (...args: unknown[]) => mockQueryCreatives(...args),
}));

const mockListFormats = vi.fn();
vi.mock("../../services/formatService.js", () => ({
  listFormats: (...args: unknown[]) => mockListFormats(...args),
}));

const mockSyncCreatives = vi.fn();
vi.mock("../../services/creativeSyncService.js", () => ({
  syncCreatives: (...args: unknown[]) => mockSyncCreatives(...args),
}));

const mockListAuthorizedProperties = vi.fn();
vi.mock("../../services/propertiesService.js", () => ({
  listAuthorizedProperties: (...args: unknown[]) =>
    mockListAuthorizedProperties(...args),
}));

const mockUpdatePerformanceIndex = vi.fn();
vi.mock("../../services/performanceIndexService.js", () => ({
  updatePerformanceIndex: (...args: unknown[]) => mockUpdatePerformanceIndex(...args),
}));

const mockListTasks = vi.fn();
vi.mock("../../services/taskListService.js", () => ({
  listTasks: (...args: unknown[]) => mockListTasks(...args),
}));

const mockGetTaskDetail = vi.fn();
vi.mock("../../services/taskDetailService.js", () => ({
  TaskNotFoundError: class TaskNotFoundError extends Error {},
  getTaskDetail: (...args: unknown[]) => mockGetTaskDetail(...args),
}));

const mockCompleteTask = vi.fn();
vi.mock("../../services/taskCompleteService.js", () => ({
  TaskAlreadyCompletedError: class TaskAlreadyCompletedError extends Error {},
  completeTask: (...args: unknown[]) => mockCompleteTask(...args),
}));

const mockGetAdcpCapabilities = vi.fn();
vi.mock("../../services/capabilitiesService.js", () => ({
  getAdcpCapabilities: (...args: unknown[]) => mockGetAdcpCapabilities(...args),
}));

const TENANT = { tenantId: "tenant-1", name: "Tenant 1" };

async function createMcpApp(
  routePlugin: FastifyPluginAsync,
  options: { withAuth?: boolean } = {},
) {
  const app = await buildApp({ logger: false, registerDefaultRoutes: false });
  if (options.withAuth) {
    app.addHook("preHandler", async (request) => {
      (request as typeof request & { auth?: { principalId: string } }).auth = {
        principalId: "principal-1",
      };
    });
  }
  await app.register(routePlugin, { prefix: "/mcp" });
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();

  mockResolveTenantFromHeaders.mockResolvedValue(TENANT);
  mockQueryProducts.mockResolvedValue({ products: [] });
  mockCheckBrandManifestPolicy.mockReturnValue({ allowed: true });
  mockRankProductsByBrief.mockImplementation(
    (_tenantId: string, _brief: string, _prompt: unknown, products: unknown[]) =>
      products,
  );
  mockNeedsV2Compat.mockReturnValue(false);
  mockAddV2CompatToProducts.mockImplementation(() => undefined);

  mockCreateMediaBuy.mockResolvedValue({
    media_buy_id: "mb-1",
    buyer_ref: "buyer-1",
    packages: [{ package_id: "pkg-1", status: "active" }],
  });
  mockUpdateMediaBuy.mockResolvedValue({ media_buy_id: "mb-1", affected_packages: [] });
  mockStripInternalFields.mockImplementation((value: unknown) => value);

  mockGetMediaBuyDelivery.mockResolvedValue({
    reporting_period: {
      start: "2025-01-01T00:00:00.000Z",
      end: "2025-01-31T00:00:00.000Z",
    },
    currency: "USD",
    aggregated_totals: { impressions: 0, spend: 0 },
    media_buy_deliveries: [],
  });

  mockQueryCreatives.mockResolvedValue({ creatives: [], totalCount: 0 });
  mockListFormats.mockResolvedValue({ formats: [] });
  mockSyncCreatives.mockResolvedValue({ creatives: [] });
  mockListAuthorizedProperties.mockResolvedValue({ publisher_domains: [] });
  mockUpdatePerformanceIndex.mockResolvedValue({ status: "success", detail: "updated" });
  mockListTasks.mockResolvedValue({
    tasks: [],
    total: 0,
    offset: 0,
    limit: 20,
    has_more: false,
  });
  mockGetTaskDetail.mockResolvedValue({
    task_id: "task-1",
    context_id: "ctx-1",
    status: "pending",
    type: "manual_review",
    tool_name: null,
    owner: "principal-1",
    created_at: "2025-01-01T00:00:00.000Z",
    updated_at: null,
    associated_objects: [],
  });
  mockCompleteTask.mockResolvedValue({
    task_id: "task-1",
    status: "completed",
    message: "Task completed",
    completed_at: "2025-01-01T00:00:00.000Z",
  });
  mockGetAdcpCapabilities.mockResolvedValue({
    adcp: { major_versions: [{ root: 3 }] },
    supported_protocols: ["media_buy"],
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MCP route validation coverage", () => {
  it("POST /mcp/get-products returns 400 for invalid body schema", async () => {
    const app = await createMcpApp(getProductsRoute);
    const res = await app.inject({
      method: "POST",
      url: "/mcp/get-products",
      payload: { brief: 123 },
    });
    await app.close();

    expect(res.statusCode).toBe(400);
    expect(mockQueryProducts).not.toHaveBeenCalled();
  });

  it("POST /mcp/get-products returns 200 on valid payload", async () => {
    const app = await createMcpApp(getProductsRoute);
    const res = await app.inject({
      method: "POST",
      url: "/mcp/get-products",
      payload: { brief: "Need display placements", brand_manifest: { name: "Acme" } },
    });
    await app.close();

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ products: [] });
  });

  it("POST /mcp/create-media-buy returns 401 without auth", async () => {
    const app = await createMcpApp(createMediaBuyRoute);
    const res = await app.inject({
      method: "POST",
      url: "/mcp/create-media-buy",
      payload: {
        brand_manifest: { name: "Acme" },
        buyer_ref: "buyer-1",
        packages: [{ product_id: "p-1", pricing_option_id: "opt-1", budget: 100 }],
        start_time: "asap",
        end_time: "2026-12-31T00:00:00.000Z",
      },
    });
    await app.close();

    expect(res.statusCode).toBe(401);
    expect(mockCreateMediaBuy).not.toHaveBeenCalled();
  });

  it("POST /mcp/create-media-buy returns 400 for invalid body schema", async () => {
    const app = await createMcpApp(createMediaBuyRoute, { withAuth: true });
    const res = await app.inject({
      method: "POST",
      url: "/mcp/create-media-buy",
      payload: { buyer_ref: "buyer-1" },
    });
    await app.close();

    expect(res.statusCode).toBe(400);
    expect(mockCreateMediaBuy).not.toHaveBeenCalled();
  });

  it("POST /mcp/create-media-buy returns 200 for valid body", async () => {
    const app = await createMcpApp(createMediaBuyRoute, { withAuth: true });
    const res = await app.inject({
      method: "POST",
      url: "/mcp/create-media-buy",
      payload: {
        brand_manifest: { name: "Acme" },
        buyer_ref: "buyer-1",
        packages: [{ product_id: "p-1", pricing_option_id: "opt-1", budget: 100 }],
        start_time: "asap",
        end_time: "2026-12-31T00:00:00.000Z",
      },
    });
    await app.close();

    expect(res.statusCode).toBe(200);
  });

  it("POST /mcp/update-media-buy returns 400 for invalid body schema", async () => {
    const app = await createMcpApp(updateMediaBuyRoute, { withAuth: true });
    const res = await app.inject({
      method: "POST",
      url: "/mcp/update-media-buy",
      payload: {},
    });
    await app.close();

    expect(res.statusCode).toBe(400);
    expect(mockUpdateMediaBuy).not.toHaveBeenCalled();
  });

  it("POST /mcp/update-media-buy returns 200 on valid payload", async () => {
    const app = await createMcpApp(updateMediaBuyRoute, { withAuth: true });
    const res = await app.inject({
      method: "POST",
      url: "/mcp/update-media-buy",
      payload: { media_buy_id: "mb-1", paused: false },
    });
    await app.close();

    expect(res.statusCode).toBe(200);
  });

  it("POST /mcp/get-media-buy-delivery returns 401 without auth", async () => {
    const app = await createMcpApp(getMediaBuyDeliveryRoute);
    const res = await app.inject({
      method: "POST",
      url: "/mcp/get-media-buy-delivery",
      payload: {},
    });
    await app.close();

    expect(res.statusCode).toBe(401);
    expect(mockGetMediaBuyDelivery).not.toHaveBeenCalled();
  });

  it("POST /mcp/get-media-buy-delivery returns 400 for invalid body schema", async () => {
    const app = await createMcpApp(getMediaBuyDeliveryRoute, { withAuth: true });
    const res = await app.inject({
      method: "POST",
      url: "/mcp/get-media-buy-delivery",
      payload: { media_buy_ids: "mb-1" },
    });
    await app.close();

    expect(res.statusCode).toBe(400);
    expect(mockGetMediaBuyDelivery).not.toHaveBeenCalled();
  });

  it("POST /mcp/get-media-buy-delivery returns 200 for valid payload", async () => {
    const app = await createMcpApp(getMediaBuyDeliveryRoute, { withAuth: true });
    const res = await app.inject({
      method: "POST",
      url: "/mcp/get-media-buy-delivery",
      payload: { media_buy_ids: ["mb-1"] },
    });
    await app.close();

    expect(res.statusCode).toBe(200);
  });

  it("POST /mcp/list-creatives returns 401 without auth", async () => {
    const app = await createMcpApp(listCreativesRoute);
    const res = await app.inject({
      method: "POST",
      url: "/mcp/list-creatives",
      payload: {},
    });
    await app.close();

    expect(res.statusCode).toBe(401);
    expect(mockQueryCreatives).not.toHaveBeenCalled();
  });

  it("POST /mcp/list-creatives returns 400 for invalid body schema", async () => {
    const app = await createMcpApp(listCreativesRoute, { withAuth: true });
    const res = await app.inject({
      method: "POST",
      url: "/mcp/list-creatives",
      payload: { pagination: { limit: "bad" } },
    });
    await app.close();

    expect(res.statusCode).toBe(400);
    expect(mockQueryCreatives).not.toHaveBeenCalled();
  });

  it("POST /mcp/list-creatives returns 200 for valid payload", async () => {
    const app = await createMcpApp(listCreativesRoute, { withAuth: true });
    const res = await app.inject({
      method: "POST",
      url: "/mcp/list-creatives",
      payload: { pagination: { offset: 0, limit: 10 } },
    });
    await app.close();

    expect(res.statusCode).toBe(200);
  });

  it("POST /mcp/list-creative-formats returns 400 for invalid body schema", async () => {
    const app = await createMcpApp(listCreativeFormatsRoute);
    const res = await app.inject({
      method: "POST",
      url: "/mcp/list-creative-formats",
      payload: { standard_only: "yes" },
    });
    await app.close();

    expect(res.statusCode).toBe(400);
    expect(mockListFormats).not.toHaveBeenCalled();
  });

  it("POST /mcp/list-creative-formats returns 200 for valid payload", async () => {
    const app = await createMcpApp(listCreativeFormatsRoute);
    const res = await app.inject({
      method: "POST",
      url: "/mcp/list-creative-formats",
      payload: { type: "display", standard_only: true },
    });
    await app.close();

    expect(res.statusCode).toBe(200);
  });

  it("POST /mcp/sync-creatives returns 401 without auth", async () => {
    const app = await createMcpApp(syncCreativesRoute);
    const res = await app.inject({
      method: "POST",
      url: "/mcp/sync-creatives",
      payload: { creatives: [] },
    });
    await app.close();

    expect(res.statusCode).toBe(401);
    expect(mockSyncCreatives).not.toHaveBeenCalled();
  });

  it("POST /mcp/sync-creatives returns 400 for invalid body schema", async () => {
    const app = await createMcpApp(syncCreativesRoute, { withAuth: true });
    const res = await app.inject({
      method: "POST",
      url: "/mcp/sync-creatives",
      payload: {},
    });
    await app.close();

    expect(res.statusCode).toBe(400);
    expect(mockSyncCreatives).not.toHaveBeenCalled();
  });

  it("POST /mcp/sync-creatives returns 200 for valid payload", async () => {
    const app = await createMcpApp(syncCreativesRoute, { withAuth: true });
    const res = await app.inject({
      method: "POST",
      url: "/mcp/sync-creatives",
      payload: {
        creatives: [
          {
            creative_id: "cr-1",
            format_id: { id: "display_300x250", agent_url: "https://example.com" },
          },
        ],
      },
    });
    await app.close();

    expect(res.statusCode).toBe(200);
  });

  it("POST /mcp/list-authorized-properties returns 400 for invalid body schema", async () => {
    const app = await createMcpApp(listAuthorizedPropertiesRoute);
    const res = await app.inject({
      method: "POST",
      url: "/mcp/list-authorized-properties",
      payload: { publisher_domains: [42] },
    });
    await app.close();

    expect(res.statusCode).toBe(400);
    expect(mockListAuthorizedProperties).not.toHaveBeenCalled();
  });

  it("POST /mcp/list-authorized-properties returns 200 for valid payload", async () => {
    const app = await createMcpApp(listAuthorizedPropertiesRoute);
    const res = await app.inject({
      method: "POST",
      url: "/mcp/list-authorized-properties",
      payload: {},
    });
    await app.close();

    expect(res.statusCode).toBe(200);
  });

  it("POST /mcp/update-performance-index returns 401 without auth", async () => {
    const app = await createMcpApp(updatePerformanceIndexRoute);
    const res = await app.inject({
      method: "POST",
      url: "/mcp/update-performance-index",
      payload: {
        media_buy_id: "mb-1",
        performance_data: [{ product_id: "p-1", performance_index: 1.05 }],
      },
    });
    await app.close();

    expect(res.statusCode).toBe(401);
    expect(mockUpdatePerformanceIndex).not.toHaveBeenCalled();
  });

  it("POST /mcp/update-performance-index returns 400 for invalid body schema", async () => {
    const app = await createMcpApp(updatePerformanceIndexRoute, { withAuth: true });
    const res = await app.inject({
      method: "POST",
      url: "/mcp/update-performance-index",
      payload: {},
    });
    await app.close();

    expect(res.statusCode).toBe(400);
    expect(mockUpdatePerformanceIndex).not.toHaveBeenCalled();
  });

  it("POST /mcp/update-performance-index returns 200 for valid payload", async () => {
    const app = await createMcpApp(updatePerformanceIndexRoute, { withAuth: true });
    const res = await app.inject({
      method: "POST",
      url: "/mcp/update-performance-index",
      payload: {
        media_buy_id: "mb-1",
        performance_data: [{ product_id: "p-1", performance_index: 1.05 }],
      },
    });
    await app.close();

    expect(res.statusCode).toBe(200);
  });

  it("POST /mcp/list-tasks returns 401 without auth", async () => {
    const app = await createMcpApp(listTasksRoute);
    const res = await app.inject({ method: "POST", url: "/mcp/list-tasks", payload: {} });
    await app.close();

    expect(res.statusCode).toBe(401);
    expect(mockListTasks).not.toHaveBeenCalled();
  });

  it("POST /mcp/list-tasks returns 400 for invalid body schema", async () => {
    const app = await createMcpApp(listTasksRoute, { withAuth: true });
    const res = await app.inject({
      method: "POST",
      url: "/mcp/list-tasks",
      payload: { limit: 1000 },
    });
    await app.close();

    expect(res.statusCode).toBe(400);
    expect(mockListTasks).not.toHaveBeenCalled();
  });

  it("POST /mcp/list-tasks returns 200 for valid payload", async () => {
    const app = await createMcpApp(listTasksRoute, { withAuth: true });
    const res = await app.inject({ method: "POST", url: "/mcp/list-tasks", payload: {} });
    await app.close();

    expect(res.statusCode).toBe(200);
  });

  it("POST /mcp/get-task returns 401 without auth", async () => {
    const app = await createMcpApp(getTaskRoute);
    const res = await app.inject({
      method: "POST",
      url: "/mcp/get-task",
      payload: { task_id: "task-1" },
    });
    await app.close();

    expect(res.statusCode).toBe(401);
    expect(mockGetTaskDetail).not.toHaveBeenCalled();
  });

  it("POST /mcp/get-task returns 400 for invalid body schema", async () => {
    const app = await createMcpApp(getTaskRoute, { withAuth: true });
    const res = await app.inject({
      method: "POST",
      url: "/mcp/get-task",
      payload: { task_id: 5 },
    });
    await app.close();

    expect(res.statusCode).toBe(400);
    expect(mockGetTaskDetail).not.toHaveBeenCalled();
  });

  it("POST /mcp/get-task returns 200 for valid payload", async () => {
    const app = await createMcpApp(getTaskRoute, { withAuth: true });
    const res = await app.inject({
      method: "POST",
      url: "/mcp/get-task",
      payload: { task_id: "task-1" },
    });
    await app.close();

    expect(res.statusCode).toBe(200);
  });

  it("POST /mcp/complete-task returns 401 without auth", async () => {
    const app = await createMcpApp(completeTaskRoute);
    const res = await app.inject({
      method: "POST",
      url: "/mcp/complete-task",
      payload: { task_id: "task-1", status: "completed" },
    });
    await app.close();

    expect(res.statusCode).toBe(401);
    expect(mockCompleteTask).not.toHaveBeenCalled();
  });

  it("POST /mcp/complete-task returns 400 for invalid body schema", async () => {
    const app = await createMcpApp(completeTaskRoute, { withAuth: true });
    const res = await app.inject({
      method: "POST",
      url: "/mcp/complete-task",
      payload: { task_id: "task-1", status: "unknown" },
    });
    await app.close();

    expect(res.statusCode).toBe(400);
    expect(mockCompleteTask).not.toHaveBeenCalled();
  });

  it("POST /mcp/complete-task returns 200 for valid payload", async () => {
    const app = await createMcpApp(completeTaskRoute, { withAuth: true });
    const res = await app.inject({
      method: "POST",
      url: "/mcp/complete-task",
      payload: { task_id: "task-1", status: "completed" },
    });
    await app.close();

    expect(res.statusCode).toBe(200);
  });

  it("GET /mcp/get-adcp-capabilities returns 200 without tenant", async () => {
    mockResolveTenantFromHeaders.mockResolvedValueOnce(null);

    const app = await createMcpApp(getAdcpCapabilitiesRoute);
    const res = await app.inject({ method: "GET", url: "/mcp/get-adcp-capabilities" });
    await app.close();

    expect(res.statusCode).toBe(200);
    expect(mockGetAdcpCapabilities).toHaveBeenCalledWith(null);
  });

  it("GET /mcp/get-adcp-capabilities returns 200 with tenant", async () => {
    const app = await createMcpApp(getAdcpCapabilitiesRoute);
    const res = await app.inject({ method: "GET", url: "/mcp/get-adcp-capabilities" });
    await app.close();

    expect(res.statusCode).toBe(200);
    expect(mockGetAdcpCapabilities).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      tenantName: "Tenant 1",
    });
  });
});