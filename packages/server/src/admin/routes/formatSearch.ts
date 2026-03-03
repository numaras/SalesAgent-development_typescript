/**
 * Format search API for Admin UI.
 * Parity with _legacy/src/admin/blueprints/format_search.py
 * Register with prefix: /api/formats
 */
import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../db/client.js";
import { creativeAgents } from "../../db/schema/agents.js";
import { tenants } from "../../db/schema/tenants.js";
import { validateOutboundUrl } from "../../security/outboundUrl.js";
import { listFormats } from "../../services/formatService.js";
import { getAdminSession } from "../services/sessionService.js";

const FORMAT_TEMPLATES: Record<
  string,
  { id: string; name: string; description: string; type: string; parameter_type: string; gam_supported: boolean }
> = {
  display_static: {
    id: "display_static",
    name: "Static Display",
    description:
      "Display banner ads (image, JS, or HTML5 - auto-detected at upload)",
    type: "display",
    parameter_type: "dimensions",
    gam_supported: true,
  },
  video_hosted: {
    id: "video_hosted",
    name: "Hosted Video",
    description: "Video ads hosted on creative agent (MP4, WebM)",
    type: "video",
    parameter_type: "both",
    gam_supported: true,
  },
  video_vast: {
    id: "video_vast",
    name: "VAST Tag",
    description: "Video ads served via VAST XML redirect",
    type: "video",
    parameter_type: "both",
    gam_supported: true,
  },
  native: {
    id: "native",
    name: "Native Ad",
    description: "Native content ads that match the look of the site",
    type: "native",
    parameter_type: "none",
    gam_supported: true,
  },
  audio: {
    id: "audio",
    name: "Audio Ad",
    description: "Audio-only ads for podcasts and streaming",
    type: "audio",
    parameter_type: "duration",
    gam_supported: false,
  },
};

const GAM_COMMON_SIZES = [
  { name: "Medium Rectangle", width: 300, height: 250 },
  { name: "Leaderboard", width: 728, height: 90 },
  { name: "Wide Skyscraper", width: 160, height: 600 },
  { name: "Large Leaderboard", width: 970, height: 90 },
  { name: "Half Page", width: 300, height: 600 },
  { name: "Large Rectangle", width: 336, height: 280 },
  { name: "Mobile Banner", width: 320, height: 50 },
  { name: "Billboard", width: 970, height: 250 },
];

// ── Minimal MCP client — mirrors Python CreativeAgentRegistry._fetch_formats ── //

async function callAgentMcpTool(
  agentUrl: string,
  toolName: string,
  args: Record<string, unknown>,
  authHeaderName: string | null,
  authCredentials: string | null,
  timeoutMs = 20_000,
): Promise<Record<string, unknown>> {
  const urlCheck = validateOutboundUrl(agentUrl, { allowHttp: true });
  if (!urlCheck.valid) {
    throw new Error(`Invalid agent URL: ${urlCheck.error}`);
  }

  const base = agentUrl.endsWith("/") ? agentUrl.slice(0, -1) : agentUrl;
  const mcpUrl = base.endsWith("/mcp") ? base : base + "/mcp";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
  };
  if (authCredentials) {
    headers[authHeaderName || "x-adcp-auth"] = authCredentials;
  }

  const initRes = await fetch(mcpUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "salesagent-format-search", version: "1.0.0" },
      },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!initRes.ok) throw new Error(`HTTP ${initRes.status} during MCP initialize`);

  const sessionId = initRes.headers.get("Mcp-Session-Id") ?? initRes.headers.get("mcp-session-id");
  if (sessionId) headers["Mcp-Session-Id"] = sessionId;
  await initRes.text().catch(() => undefined);

  // Send initialized notification before tool calls (required by MCP spec)
  await fetch(mcpUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    signal: AbortSignal.timeout(5_000),
  }).catch(() => undefined);

  const toolRes = await fetch(mcpUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: toolName, arguments: args },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!toolRes.ok) throw new Error(`HTTP ${toolRes.status} during MCP tool call`);

  const bodyText = await toolRes.text();
  const contentType = toolRes.headers.get("content-type") ?? "";
  let rpc: Record<string, unknown>;
  if (contentType.includes("text/event-stream") || bodyText.trimStart().startsWith("event:") || bodyText.trimStart().startsWith("data:")) {
    const dataLine = bodyText.split("\n").find((l) => l.startsWith("data:"));
    if (!dataLine) throw new Error("MCP SSE response had no data line");
    rpc = JSON.parse(dataLine.slice("data:".length).trim()) as Record<string, unknown>;
  } else {
    rpc = JSON.parse(bodyText) as Record<string, unknown>;
  }

  if (rpc["error"]) {
    const err = rpc["error"] as Record<string, unknown>;
    throw new Error(String(err["message"] ?? "MCP error"));
  }

  const result = rpc["result"] as Record<string, unknown> | undefined;
  const content = result?.["content"];
  if (Array.isArray(content) && content.length > 0) {
    const first = content[0] as Record<string, unknown>;
    if (first["type"] === "text" && typeof first["text"] === "string") {
      return JSON.parse(first["text"]) as Record<string, unknown>;
    }
  }
  return result ?? {};
}

interface AgentConfig {
  agent_url: string;
  auth_header: string | null;
  auth_credentials: string | null;
}

interface FormatEntry {
  agent_url: string;
  format_id: string;
  name: string;
  type: string;
  category: string | null;
  description: string | null;
  is_standard: boolean;
  dimensions: string | null;
}

async function fetchFormatsFromAgent(cfg: AgentConfig): Promise<FormatEntry[]> {
  const raw = await callAgentMcpTool(
    cfg.agent_url,
    "list_creative_formats",
    {},
    cfg.auth_header,
    cfg.auth_credentials,
  );

  const formats = Array.isArray(raw["formats"])
    ? (raw["formats"] as Record<string, unknown>[])
    : [];

  return formats.map((f) => {
    const formatIdRaw = f["format_id"];
    const formatIdStr =
      typeof formatIdRaw === "string"
        ? formatIdRaw
        : typeof formatIdRaw === "object" && formatIdRaw !== null
          ? String((formatIdRaw as Record<string, unknown>)["id"] ?? "")
          : String(formatIdRaw ?? "");

    const reqs = f["requirements"] as Record<string, unknown> | undefined;
    let dimensions: string | null = null;
    if (reqs && typeof reqs["width"] === "number" && typeof reqs["height"] === "number") {
      dimensions = `${reqs["width"]}x${reqs["height"]}`;
    }

    return {
      agent_url: cfg.agent_url,
      format_id: formatIdStr,
      name: typeof f["name"] === "string" ? f["name"] : formatIdStr,
      type: typeof f["type"] === "string" ? f["type"] : "display",
      category: typeof f["category"] === "string" ? f["category"] : null,
      description: typeof f["description"] === "string" ? f["description"] : null,
      is_standard: f["is_standard"] === true,
      dimensions,
    };
  });
}

async function buildAgentList(tenantId?: string): Promise<AgentConfig[]> {
  const agents: AgentConfig[] = [
    { agent_url: "https://creative.adcontextprotocol.org", auth_header: null, auth_credentials: null },
  ];

  if (tenantId) {
    const dbAgents = await db
      .select()
      .from(creativeAgents)
      .where(eq(creativeAgents.tenantId, tenantId))
      .orderBy(creativeAgents.priority);

    for (const a of dbAgents) {
      if (!a.enabled) continue;
      const urlCheck = validateOutboundUrl(a.agentUrl, { allowHttp: true });
      if (!urlCheck.valid) continue;
      agents.push({
        agent_url: a.agentUrl,
        auth_header: a.authHeader ?? null,
        auth_credentials: a.authCredentials ?? null,
      });
    }
  }

  return agents;
}

const formatSearchRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/search", async (request, reply) => {
    const session = getAdminSession(request);
    if (!session.user) return reply.code(401).send({ error: "UNAUTHENTICATED" });

    const q = request.query as { q?: string; tenant_id?: string; type?: string };
    const query = q.q ?? "";
    if (!query || query.length < 2) {
      return reply.code(400).send({ error: "Query must be at least 2 characters" });
    }

    const typeFilter = typeof q.type === "string" ? q.type.toLowerCase() : null;

    try {
      const agentList = await buildAgentList(q.tenant_id);
      const allFormats: FormatEntry[] = [];

      await Promise.allSettled(
        agentList.map(async (cfg) => {
          try {
            const fmts = await fetchFormatsFromAgent(cfg);
            allFormats.push(...fmts);
          } catch {
            // Individual agent failure doesn't abort the whole search
          }
        })
      );

      const lowerQ = query.toLowerCase();
      let results = allFormats.filter(
        (f) =>
          f.format_id.toLowerCase().includes(lowerQ) ||
          f.name.toLowerCase().includes(lowerQ) ||
          (f.description?.toLowerCase().includes(lowerQ) ?? false)
      );

      if (typeFilter) {
        results = results.filter((f) => f.type.toLowerCase() === typeFilter);
      }

      return reply.send({ formats: results, count: results.length });
    } catch (err: unknown) {
      return reply.code(500).send({ error: String((err as Error).message ?? err) });
    }
  });

  fastify.get("/list", async (request, reply) => {
    const session = getAdminSession(request);
    if (!session.user) return reply.code(401).send({ error: "UNAUTHENTICATED" });

    const q = request.query as { tenant_id?: string; type?: string };
    const tenantId = typeof q.tenant_id === "string" ? q.tenant_id : "";
    const typeFilter = typeof q.type === "string" ? q.type.toLowerCase() : null;

    try {
      // Use formatService which has built-in DEFAULT_FORMATS fallback — always returns formats.
      const result = await listFormats({ tenantId }, {});
      let formats = result.formats;
      if (typeFilter) formats = formats.filter((f) => f.type?.toLowerCase() === typeFilter);

      // source: "live" if agent responded without errors, "fallback" if defaults were used
      const source: "live" | "fallback" =
        result.errors && result.errors.length > 0 ? "fallback" : "live";

      const byAgent: Record<string, Array<{
        format_id: { id: string; agent_url: string };
        name: string;
        type: string;
        category: string | null;
        description: string | null;
        is_standard: boolean;
        dimensions: string | null;
      }>> = {};

      for (const f of formats) {
        const agentUrl = f.format_id.agent_url;
        if (!byAgent[agentUrl]) byAgent[agentUrl] = [];
        const render = f.renders?.[0];
        const dims = render?.dimensions?.width && render?.dimensions?.height
          ? `${render.dimensions.width}x${render.dimensions.height}`
          : null;
        byAgent[agentUrl].push({
          format_id: { id: f.format_id.id, agent_url: agentUrl },
          name: f.name ?? f.format_id.id,
          type: f.type ?? "display",
          category: null,
          description: f.description ?? null,
          is_standard: f.is_standard ?? false,
          dimensions: dims,
        });
      }

      return reply.send({
        agents: byAgent,
        total_formats: formats.length,
        source,
        errors: result.errors ?? [],
      });
    } catch (err: unknown) {
      return reply.code(500).send({ error: String((err as Error).message ?? err) });
    }
  });

  fastify.get("/templates", async (request, reply) => {
    const session = getAdminSession(request);
    if (!session.user) return reply.code(401).send({ error: "UNAUTHENTICATED" });

    const adapterType = (request.query as { adapter_type?: string }).adapter_type ?? "mock";
    const templates =
      adapterType === "gam"
        ? Object.fromEntries(
            Object.entries(FORMAT_TEMPLATES).filter(([, v]) => v.gam_supported)
          )
        : FORMAT_TEMPLATES;

    return reply.send({
      templates,
      common_sizes: GAM_COMMON_SIZES,
      default_agent_url: "https://creative.adcontextprotocol.org",
    });
  });

  fastify.get("/agents", async (request, reply) => {
    const session = getAdminSession(request);
    if (!session.user) return reply.code(401).send({ error: "UNAUTHENTICATED" });

    const tenantId = (request.query as { tenant_id?: string }).tenant_id;
    if (!tenantId) {
      return reply.code(400).send({ error: "tenant_id is required" });
    }

    const [tenant] = await db.select().from(tenants).where(eq(tenants.tenantId, tenantId)).limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const agents: Array<{
      agent_url: string;
      name: string;
      enabled: boolean;
      priority: number;
      is_default: boolean;
    }> = [
      {
        agent_url: "https://creative.adcontextprotocol.org",
        name: "AdCP Standard Creative Agent",
        enabled: true,
        priority: 1,
        is_default: true,
      },
    ];

    const dbAgents = await db
      .select()
      .from(creativeAgents)
      .where(eq(creativeAgents.tenantId, tenantId))
      .orderBy(creativeAgents.priority);

    for (const a of dbAgents) {
      if (!a.enabled) continue;
      agents.push({
        agent_url: a.agentUrl,
        name: a.name,
        enabled: a.enabled,
        priority: a.priority ?? 999,
        is_default: false,
      });
    }

    agents.sort((a, b) => a.priority - b.priority);
    return reply.send({ agents });
  });
};

export default formatSearchRoute;
