/**
 * POST /mcp  — MCP Streamable HTTP protocol endpoint (stateless).
 * DELETE /mcp — Session termination (no-op in stateless mode).
 *
 * Implements the MCP wire protocol so standard MCP clients (Claude Desktop via
 * mcp-remote, MCP Inspector, etc.) can connect. Each POST request creates a
 * fresh McpServer + StreamableHTTPServerTransport and handles the full
 * initialize → tools/list → tools/call lifecycle.
 *
 * Auth: extracted from request.auth (set by authPlugin). Tools that require
 * auth return an isError response if the principal is not resolved.
 * Tenant: from request.auth.tenantId, or x-adcp-tenant header as fallback.
 *
 * Register WITHOUT /mcp prefix so it lands at POST /mcp exactly:
 *   await app.register(mcpProtocolRoute)
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { resolveTenantFromHeaders } from "../../auth/resolveTenantFromHost.js";
import { getAdcpCapabilities } from "../../services/capabilitiesService.js";
import { getMediaBuyDelivery } from "../../services/deliveryQueryService.js";
import { listFormats } from "../../services/formatService.js";
import { listMediaBuys } from "../../services/mediaBuyListService.js";
import { createMediaBuy } from "../../services/mediaBuyCreateService.js";
import { updateMediaBuy } from "../../services/mediaBuyUpdateService.js";
import { updatePerformanceIndex } from "../../services/performanceIndexService.js";
import { listAuthorizedProperties } from "../../services/propertiesService.js";
import { queryCreatives } from "../../services/creativeQueryService.js";
import { syncCreatives } from "../../services/creativeSyncService.js";
import { queryProducts } from "../../services/productQueryService.js";
import { listTasks } from "../../services/taskListService.js";
import { getTaskDetail } from "../../services/taskDetailService.js";
import { completeTask } from "../../services/taskCompleteService.js";

interface AuthContext {
  tenantId: string;
  principalId: string;
}

function errResult(message: string) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }],
    isError: true,
  };
}

function okResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data) }],
  };
}

function buildMcpServer(auth: AuthContext | null, tenantId: string | null) {
  const server = new McpServer({ name: "adcp-sales-agent", version: "1.0.0" });

  // ── Helpers ─────────────────────────────────────────────────────────── //
  function requireAuth(): AuthContext | null {
    return auth;
  }

  // ── get_adcp_capabilities (auth optional) ────────────────────────────── //
  server.tool(
    "get_adcp_capabilities",
    "Discover the AdCP server capabilities, supported channels, and publisher domains.",
    {},
    async () => {
      const ctx = tenantId ? { tenantId } : null;
      const result = await getAdcpCapabilities(ctx);
      return okResult(result);
    },
  );

  // ── get_products (auth optional) ─────────────────────────────────────── //
  server.tool(
    "get_products",
    "Search and list available ad products matching an advertiser brief.",
    {
      brief: z.string().optional().describe("Natural language description of the campaign"),
      brand_manifest: z.record(z.string(), z.unknown()).optional(),
      channels: z.array(z.string()).optional(),
      formats: z.array(z.string()).optional(),
      budget: z.number().optional(),
      currency: z.string().optional(),
      start_date: z.string().optional(),
      end_date: z.string().optional(),
    },
    async (params) => {
      if (!tenantId) return errResult("Cannot determine tenant.");
      const result = await queryProducts({ tenantId }, params as never);
      return okResult(result);
    },
  );

  // ── list_creative_formats (auth optional) ────────────────────────────── //
  server.tool(
    "list_creative_formats",
    "List supported creative formats and their specifications.",
    { channels: z.array(z.string()).optional() },
    async (params) => {
      const ctx = tenantId ? { tenantId } : { tenantId: "" };
      const result = await listFormats(ctx, params);
      return okResult(result);
    },
  );

  // ── list_authorized_properties (auth optional) ───────────────────────── //
  server.tool(
    "list_authorized_properties",
    "List publisher properties available for targeting.",
    {
      search: z.string().optional(),
      tag: z.string().optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    },
    async (params) => {
      if (!tenantId) return errResult("Cannot determine tenant.");
      const result = await listAuthorizedProperties({ tenantId }, params);
      return okResult(result);
    },
  );

  // ── create_media_buy (auth required) ─────────────────────────────────── //
  server.tool(
    "create_media_buy",
    "Create a new advertising campaign (media buy).",
    {
      brand_manifest: z.record(z.string(), z.unknown()),
      buyer_ref: z.string().optional(),
      packages: z.array(z.record(z.string(), z.unknown())),
      start_time: z.union([z.literal("asap"), z.string()]).optional(),
      end_time: z.string().optional(),
      context: z.record(z.string(), z.unknown()).optional(),
    },
    async (params) => {
      const ctx = requireAuth();
      if (!ctx) return errResult("UNAUTHORIZED: x-adcp-auth header required.");
      const result = await createMediaBuy(ctx, params as never);
      return okResult(result);
    },
  );

  // ── update_media_buy (auth required) ─────────────────────────────────── //
  server.tool(
    "update_media_buy",
    "Update an existing media buy — pause, resume, change budget, dates, or creatives.",
    {
      media_buy_id: z.string().optional(),
      buyer_ref: z.string().optional(),
      paused: z.boolean().optional(),
      budget: z.union([z.object({ total: z.number(), currency: z.string() }), z.number()]).optional(),
      start_time: z.string().optional(),
      end_time: z.string().optional(),
      packages: z.array(z.record(z.string(), z.unknown())).optional(),
    },
    async (params) => {
      const ctx = requireAuth();
      if (!ctx) return errResult("UNAUTHORIZED: x-adcp-auth header required.");
      const result = await updateMediaBuy(ctx, params as never);
      return okResult(result);
    },
  );

  // ── get_media_buys (auth required) ───────────────────────────────────── //
  server.tool(
    "get_media_buys",
    "List media buys owned by the authenticated principal, with optional filters.",
    {
      media_buy_ids: z.array(z.string()).optional(),
      buyer_refs: z.array(z.string()).optional(),
      status_filter: z.string().optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    },
    async (params) => {
      const ctx = requireAuth();
      if (!ctx) return errResult("UNAUTHORIZED: x-adcp-auth header required.");
      const result = await listMediaBuys(ctx, params as never);
      return okResult(result);
    },
  );

  // ── get_media_buy_delivery (auth required) ───────────────────────────── //
  server.tool(
    "get_media_buy_delivery",
    "Retrieve live delivery metrics and reporting data for media buys.",
    {
      media_buy_ids: z.array(z.string()).optional(),
      buyer_refs: z.array(z.string()).optional(),
      status_filter: z.string().optional(),
      start_date: z.string().optional(),
      end_date: z.string().optional(),
    },
    async (params) => {
      const ctx = requireAuth();
      if (!ctx) return errResult("UNAUTHORIZED: x-adcp-auth header required.");
      const result = await getMediaBuyDelivery(ctx, params as never);
      return okResult(result);
    },
  );

  // ── sync_creatives (auth required) ───────────────────────────────────── //
  server.tool(
    "sync_creatives",
    "Upload or update creative assets tied to a media buy.",
    {
      media_buy_id: z.string().optional(),
      creatives: z.array(z.record(z.string(), z.unknown())).optional(),
    },
    async (params) => {
      const ctx = requireAuth();
      if (!ctx) return errResult("UNAUTHORIZED: x-adcp-auth header required.");
      const result = await syncCreatives(ctx, params as never);
      return okResult(result);
    },
  );

  // ── list_creatives (auth required) ───────────────────────────────────── //
  server.tool(
    "list_creatives",
    "Search and list creative assets in the library.",
    {
      media_buy_id: z.string().optional(),
      status: z.string().optional(),
      pagination: z.object({ limit: z.number().optional(), offset: z.number().optional() }).optional(),
    },
    async (params) => {
      const ctx = requireAuth();
      if (!ctx) return errResult("UNAUTHORIZED: x-adcp-auth header required.");
      const { creatives, totalCount } = await queryCreatives(ctx, params as never);
      return okResult({ creatives, total: totalCount });
    },
  );

  // ── update_performance_index (auth required) ─────────────────────────── //
  server.tool(
    "update_performance_index",
    "Push performance signal data into the format metrics index.",
    {
      format_id: z.string(),
      impressions: z.number(),
      spend: z.number(),
      cpm: z.number().optional(),
    },
    async (params) => {
      const ctx = requireAuth();
      if (!ctx) return errResult("UNAUTHORIZED: x-adcp-auth header required.");
      const result = await updatePerformanceIndex(ctx, params as never);
      return okResult(result);
    },
  );

  // ── list_tasks (auth required) ───────────────────────────────────────── //
  server.tool(
    "list_tasks",
    "List pending Human-in-the-Loop (HITL) workflow tasks.",
    {
      status: z.string().optional(),
      object_type: z.string().optional(),
      object_id: z.string().optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    },
    async (params) => {
      const ctx = requireAuth();
      if (!ctx) return errResult("UNAUTHORIZED: x-adcp-auth header required.");
      const result = await listTasks({ contextId: undefined }, params as never);
      return okResult(result);
    },
  );

  // ── get_task (auth required) ──────────────────────────────────────────── //
  server.tool(
    "get_task",
    "Get details of a specific HITL workflow task.",
    { task_id: z.string() },
    async (params) => {
      const ctx = requireAuth();
      if (!ctx) return errResult("UNAUTHORIZED: x-adcp-auth header required.");
      const result = await getTaskDetail({}, params.task_id);
      return okResult(result);
    },
  );

  // ── complete_task (auth required) ─────────────────────────────────────── //
  server.tool(
    "complete_task",
    "Mark a HITL workflow task as completed or failed.",
    {
      task_id: z.string(),
      status: z.enum(["completed", "failed"]),
      response_data: z.record(z.string(), z.unknown()).optional(),
      error_message: z.string().optional(),
    },
    async (params) => {
      const ctx = requireAuth();
      if (!ctx) return errResult("UNAUTHORIZED: x-adcp-auth header required.");
      const result = await completeTask(
        { principalId: ctx.principalId },
        params as never,
      );
      return okResult(result);
    },
  );

  return server;
}

const mcpProtocolRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // POST /mcp — Streamable HTTP (primary MCP transport)
  fastify.post(
    "/mcp",
    { config: { skipAudit: true } },
    async (request, reply) => {
      const headers = request.headers as Record<string, string | string[] | undefined>;

      // Auth is already resolved by authPlugin into request.auth.
      // For tenant-only context (no principal), fall back to header resolution.
      const auth = (request.auth as AuthContext | undefined) ?? null;
      const tenantId =
        auth?.tenantId ??
        (await resolveTenantFromHeaders(headers))?.tenantId ??
        null;

      const mcpServer = buildMcpServer(auth, tenantId);
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless — no session tracking
      });

      reply.hijack();

      try {
        await mcpServer.connect(transport);
        await transport.handleRequest(request.raw, reply.raw, request.body);
      } catch (err) {
        if (!reply.raw.headersSent) {
          reply.raw.writeHead(500, { "Content-Type": "application/json" });
          reply.raw.end(JSON.stringify({ error: "MCP_ERROR", message: String(err) }));
        }
      } finally {
        await mcpServer.close().catch(() => undefined);
      }
    },
  );

  // DELETE /mcp — session termination (no-op in stateless mode)
  fastify.delete("/mcp", async (_request, reply) => {
    return reply.code(200).send({ ok: true });
  });
};

export default mcpProtocolRoute;
