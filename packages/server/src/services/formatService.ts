/**
 * Creative format listing service (list-creative-formats).
 *
 * Legacy equivalent: _legacy/src/core/tools/creative_formats.py → _list_creative_formats_impl()
 * Returns formats from default + tenant creative agents, with graceful fallback.
 */
import { and, eq } from "drizzle-orm";

import type {
  Format,
  ListCreativeFormatsRequest,
  ListCreativeFormatsResponse,
} from "../schemas/creativeFormats.js";
import { ListCreativeFormatsResponseSchema } from "../schemas/creativeFormats.js";
import { db } from "../db/client.js";
import { creativeAgents } from "../db/schema/agents.js";
import { validateOutboundUrl } from "../security/outboundUrl.js";

const DEFAULT_AGENT_URL = "https://creative.adcontextprotocol.org";

type AgentEntry = {
  agent_url: string;
  name: string;
  source: "default" | "tenant";
  priority: number;
  timeout_seconds: number;
  auth_header: string | null;
  auth_credentials: string | null;
};

/** Default reference formats returned when the creative agent is unreachable. */
const DEFAULT_FORMATS: Format[] = [
  // ── Display (IAB standard sizes) ──────────────────────────────────────── //
  { format_id: { agent_url: DEFAULT_AGENT_URL, id: "display_300x250" }, name: "Display 300×250", description: "Medium Rectangle (IAB)", type: "display", renders: [{ dimensions: { width: 300, height: 250 }, label: "Primary" }], is_standard: true },
  { format_id: { agent_url: DEFAULT_AGENT_URL, id: "display_728x90" }, name: "Display 728×90", description: "Leaderboard (IAB)", type: "display", renders: [{ dimensions: { width: 728, height: 90 }, label: "Primary" }], is_standard: true },
  { format_id: { agent_url: DEFAULT_AGENT_URL, id: "display_320x50" }, name: "Display 320×50", description: "Mobile Banner (IAB)", type: "display", renders: [{ dimensions: { width: 320, height: 50 }, label: "Primary" }], is_standard: true },
  { format_id: { agent_url: DEFAULT_AGENT_URL, id: "display_300x600" }, name: "Display 300×600", description: "Half Page (IAB)", type: "display", renders: [{ dimensions: { width: 300, height: 600 }, label: "Primary" }], is_standard: true },
  { format_id: { agent_url: DEFAULT_AGENT_URL, id: "display_970x250" }, name: "Display 970×250", description: "Billboard (IAB)", type: "display", renders: [{ dimensions: { width: 970, height: 250 }, label: "Primary" }], is_standard: true },
  { format_id: { agent_url: DEFAULT_AGENT_URL, id: "display_160x600" }, name: "Display 160×600", description: "Wide Skyscraper (IAB)", type: "display", renders: [{ dimensions: { width: 160, height: 600 }, label: "Primary" }], is_standard: true },
  { format_id: { agent_url: DEFAULT_AGENT_URL, id: "display_320x100" }, name: "Display 320×100", description: "Large Mobile Banner", type: "display", renders: [{ dimensions: { width: 320, height: 100 }, label: "Primary" }], is_standard: true },
  // ── Video ─────────────────────────────────────────────────────────────── //
  { format_id: { agent_url: DEFAULT_AGENT_URL, id: "video_16x9" }, name: "Video 16:9", description: "Standard widescreen pre-roll / mid-roll", type: "video", renders: [{ dimensions: { width: 1920, height: 1080 }, label: "Primary" }], is_standard: true },
  { format_id: { agent_url: DEFAULT_AGENT_URL, id: "video_vast" }, name: "VAST Tag", description: "Video via VAST XML redirect (any player)", type: "video", renders: [{ dimensions: { width: 1280, height: 720 }, label: "Primary" }], is_standard: true },
  { format_id: { agent_url: DEFAULT_AGENT_URL, id: "video_9x16" }, name: "Video 9:16", description: "Vertical video (Stories / Reels)", type: "video", renders: [{ dimensions: { width: 1080, height: 1920 }, label: "Primary" }], is_standard: false },
  // ── Native ────────────────────────────────────────────────────────────── //
  { format_id: { agent_url: DEFAULT_AGENT_URL, id: "native_feed" }, name: "Native In-Feed", description: "Native ad within content feeds", type: "native", renders: [], is_standard: true },
  { format_id: { agent_url: DEFAULT_AGENT_URL, id: "native_content" }, name: "Native Content Recommendation", description: "Sponsored content recommendation widget", type: "native", renders: [], is_standard: true },
  // ── Audio ─────────────────────────────────────────────────────────────── //
  { format_id: { agent_url: DEFAULT_AGENT_URL, id: "audio_standard" }, name: "Audio Ad", description: "Audio spot for streaming / podcast", type: "audio", renders: [], is_standard: true },
];

export interface FormatServiceContext {
  tenantId: string;
}

function shouldUseDbDiscovery(): boolean {
  // Unit tests can skip DB probing to keep tests deterministic.
  if (process.env["NODE_ENV"] === "test" && !process.env["FORMAT_SERVICE_USE_DB_IN_TEST"]) {
    return false;
  }
  return true;
}

function shouldUseAgentProbe(): boolean {
  if (process.env["NODE_ENV"] === "test" && !process.env["FORMAT_SERVICE_USE_LIVE_AGENT_IN_TEST"]) {
    return false;
  }
  return true;
}

/** Parse an MCP response body that may be plain JSON or SSE (data: ...) format. */
function parseMcpResponseBody(bodyText: string, contentType: string): Record<string, unknown> {
  if (contentType.includes("text/event-stream") || bodyText.trimStart().startsWith("event:") || bodyText.trimStart().startsWith("data:")) {
    const dataLine = bodyText.split("\n").find((l) => l.startsWith("data:"));
    if (!dataLine) throw new Error("MCP SSE response had no data line");
    return JSON.parse(dataLine.slice("data:".length).trim()) as Record<string, unknown>;
  }
  return JSON.parse(bodyText) as Record<string, unknown>;
}

async function callAgentMcpTool(
  agentUrl: string,
  authHeaderName: string | null,
  authCredentials: string | null,
  timeoutMs: number,
): Promise<Record<string, unknown>> {
  const base = agentUrl.endsWith("/") ? agentUrl.slice(0, -1) : agentUrl;
  const mcpUrl = base.endsWith("/mcp") ? base : `${base}/mcp`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
  };
  if (authCredentials) {
    headers[authHeaderName || "x-adcp-auth"] = authCredentials;
  }

  // Step 1: initialize
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
        clientInfo: { name: "salesagent-format-service", version: "1.0.0" },
      },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!initRes.ok) throw new Error(`MCP initialize failed (HTTP ${initRes.status})`);

  const sessionId = initRes.headers.get("Mcp-Session-Id") ?? initRes.headers.get("mcp-session-id");
  if (sessionId) headers["Mcp-Session-Id"] = sessionId;
  await initRes.text().catch(() => undefined); // consume body to free HTTP/2 stream

  // Step 2: send initialized notification (required by MCP spec before tool calls)
  await fetch(mcpUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    signal: AbortSignal.timeout(5_000),
  }).catch(() => undefined); // notification — ignore errors and response

  // Step 3: tools/call
  const toolRes = await fetch(mcpUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "list_creative_formats", arguments: {} },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!toolRes.ok) throw new Error(`MCP tool call failed (HTTP ${toolRes.status})`);

  const bodyText = await toolRes.text();
  const rpc = parseMcpResponseBody(bodyText, toolRes.headers.get("content-type") ?? "");

  if (rpc["error"]) {
    const err = rpc["error"] as Record<string, unknown>;
    throw new Error(String(err["message"] ?? "MCP error"));
  }

  const result = rpc["result"] as Record<string, unknown> | undefined;

  // Prefer structuredContent (machine-readable) over content[0].text (markdown)
  if (result?.["structuredContent"] && typeof result["structuredContent"] === "object") {
    return result["structuredContent"] as Record<string, unknown>;
  }

  // Fallback: try parsing content[0].text as JSON (some agents embed JSON there)
  const content = result?.["content"];
  if (Array.isArray(content) && content.length > 0) {
    const first = content[0] as Record<string, unknown>;
    if (first["type"] === "text" && typeof first["text"] === "string") {
      try {
        return JSON.parse(first["text"]) as Record<string, unknown>;
      } catch {
        // text is human-readable markdown, not JSON — ignore
      }
    }
  }
  return result ?? {};
}

function parseAgentFormats(agent: AgentEntry, payload: Record<string, unknown>): Format[] {
  const rows = Array.isArray(payload["formats"])
    ? (payload["formats"] as Record<string, unknown>[])
    : [];

  return rows.flatMap((raw): Format[] => {
    const rawId = raw["format_id"];
    const rawIdObj = typeof rawId === "object" && rawId !== null
      ? (rawId as Record<string, unknown>)
      : null;
    const id = typeof rawIdObj?.["id"] === "string"
      ? rawIdObj["id"]
      : typeof rawId === "string"
        ? rawId
        : "";
    if (!id) return [];

    const agentUrl = typeof rawIdObj?.["agent_url"] === "string"
      ? rawIdObj["agent_url"]
      : agent.agent_url;

    const type = typeof raw["type"] === "string" ? raw["type"] : undefined;
    const description = typeof raw["description"] === "string" ? raw["description"] : undefined;
    const name = typeof raw["name"] === "string" ? raw["name"] : id;

    const requirements = raw["requirements"] as Record<string, unknown> | undefined;
    const reqWidth = typeof requirements?.["width"] === "number" ? requirements["width"] : undefined;
    const reqHeight = typeof requirements?.["height"] === "number" ? requirements["height"] : undefined;
    const rendered = Array.isArray(raw["renders"])
      ? (raw["renders"] as Format["renders"])
      : reqWidth || reqHeight
        ? [{ dimensions: { width: reqWidth, height: reqHeight }, label: "Primary" }]
        : undefined;

    const assets = Array.isArray(raw["assets"]) ? (raw["assets"] as Format["assets"]) : undefined;
    const isStandard = raw["is_standard"] === true;
    const category = typeof raw["category"] === "string" ? raw["category"] : undefined;

    return [
      {
        format_id: { agent_url: agentUrl, id },
        name,
        description,
        type,
        renders: rendered,
        assets,
        is_standard: isStandard,
        ...(category ? { category } : {}),
      } as Format,
    ];
  });
}

async function discoverFormats(
  tenantId: string,
): Promise<{
  formats: Format[];
  creative_agents: Array<Record<string, unknown>>;
  errors: Array<Record<string, unknown>>;
}> {
  const creative_agents: Array<Record<string, unknown>> = [];
  const errors: Array<Record<string, unknown>> = [];
  const agents: AgentEntry[] = [
    {
      agent_url: DEFAULT_AGENT_URL,
      name: "Default AdCP Creative Agent",
      source: "default",
      priority: 0,
      timeout_seconds: 30,
      auth_header: null,
      auth_credentials: null,
    },
  ];

  if (!shouldUseAgentProbe()) {
    creative_agents.push({
      agent_url: DEFAULT_AGENT_URL,
      name: "Default AdCP Creative Agent",
      source: "default",
      priority: 0,
      timeout_seconds: 30,
    });
    return { formats: [...DEFAULT_FORMATS], creative_agents, errors };
  }

  if (shouldUseDbDiscovery()) {
    try {
      const tenantAgents = await db
        .select()
        .from(creativeAgents)
        .where(and(eq(creativeAgents.tenantId, tenantId), eq(creativeAgents.enabled, true)))
        .orderBy(creativeAgents.priority);

      for (const row of tenantAgents) {
        const urlCheck = validateOutboundUrl(row.agentUrl, { allowHttp: true });
        if (!urlCheck.valid) {
          errors.push({
            agent_url: row.agentUrl,
            error: `Invalid agent URL: ${urlCheck.error}`,
          });
          continue;
        }
        agents.push({
          agent_url: row.agentUrl,
          name: row.name,
          source: "tenant",
          priority: row.priority,
          timeout_seconds: row.timeout,
          auth_header: row.authHeader ?? null,
          auth_credentials: row.authCredentials ?? null,
        });
      }
    } catch (err) {
      errors.push({
        agent_url: null,
        error: `Tenant creative-agent lookup failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  const allFormats: Format[] = [];
  await Promise.allSettled(
    agents.map(async (agent) => {
      const timeoutMs = Math.max(1, agent.timeout_seconds) * 1000;
      creative_agents.push({
        agent_url: agent.agent_url,
        name: agent.name,
        source: agent.source,
        priority: agent.priority,
        timeout_seconds: agent.timeout_seconds,
      });
      try {
        const payload = await callAgentMcpTool(
          agent.agent_url,
          agent.auth_header,
          agent.auth_credentials,
          timeoutMs,
        );
        allFormats.push(...parseAgentFormats(agent, payload));
      } catch (err) {
        errors.push({
          agent_url: agent.agent_url,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }),
  );

  if (allFormats.length === 0) {
    return { formats: [...DEFAULT_FORMATS], creative_agents, errors };
  }

  const deduped = new Map<string, Format>();
  for (const format of allFormats) {
    const key = `${format.format_id.agent_url}::${format.format_id.id}`;
    if (!deduped.has(key)) deduped.set(key, format);
  }

  return { formats: [...deduped.values()], creative_agents, errors };
}

/**
 * List creative formats for a tenant, optionally filtered by request.
 *
 * Applies AdCP filters: type, format_ids, standard_only, category, is_responsive,
 * name_search, asset_types, min/max_width/height. Sorts by type+name.
 */
export async function listFormats(
  ctx: FormatServiceContext,
  request: ListCreativeFormatsRequest,
): Promise<ListCreativeFormatsResponse> {
  const discovered = await discoverFormats(ctx.tenantId);
  let formats = discovered.formats;

  if (request.type) {
    const typeLower = request.type.toLowerCase();
    formats = formats.filter((f) => f.type?.toLowerCase() === typeLower);
  }

  if (request.format_ids && request.format_ids.length > 0) {
    formats = formats.filter((f) =>
      request.format_ids!.some(
        (wanted) =>
          wanted.id === f.format_id.id &&
          (!wanted.agent_url || wanted.agent_url === f.format_id.agent_url),
      ),
    );
  }

  if (request.standard_only === true) {
    formats = formats.filter((f) => f.is_standard === true);
  }

  if (request.category) {
    const wanted = request.category.toLowerCase();
    formats = formats.filter((f) => {
      const v = (f as Record<string, unknown>)["category"];
      return typeof v === "string" && v.toLowerCase() === wanted;
    });
  }

  if (request.is_responsive !== undefined && request.is_responsive !== null) {
    formats = formats.filter((f) => {
      const isResponsive = (f.renders ?? []).some((r) => {
        const dims = r.dimensions as Record<string, unknown> | undefined;
        const resp = dims?.["responsive"] as Record<string, unknown> | undefined;
        return Boolean(resp && (resp["width"] || resp["height"]));
      });
      return isResponsive === request.is_responsive;
    });
  }

  if (request.name_search) {
    const searchTerm = request.name_search.toLowerCase();
    formats = formats.filter((f) => (f.name ?? "").toLowerCase().includes(searchTerm));
  }

  if (request.asset_types && request.asset_types.length > 0) {
    const requestedTypes = new Set(request.asset_types.map((t) => String(t).toLowerCase()));
    formats = formats.filter((f) => {
      const formatTypes = new Set(
        (f.assets ?? [])
          .map((a) => {
            const ct = (a as Record<string, unknown>)["content_type"];
            return ct ? String(ct).toLowerCase() : null;
          })
          .filter(Boolean) as string[],
      );
      return [...requestedTypes].some((t) => formatTypes.has(t));
    });
  }

  const getDimensions = (f: Format): Array<{ w?: number; h?: number }> =>
    (f.renders ?? []).map((r) => ({
      w: r.dimensions?.width,
      h: r.dimensions?.height,
    }));

  if (request.min_width !== undefined) {
    formats = formats.filter((f) => getDimensions(f).some((d) => d.w !== undefined && d.w >= request.min_width!));
  }
  if (request.max_width !== undefined) {
    formats = formats.filter((f) => getDimensions(f).some((d) => d.w !== undefined && d.w <= request.max_width!));
  }
  if (request.min_height !== undefined) {
    formats = formats.filter((f) => getDimensions(f).some((d) => d.h !== undefined && d.h >= request.min_height!));
  }
  if (request.max_height !== undefined) {
    formats = formats.filter((f) => getDimensions(f).some((d) => d.h !== undefined && d.h <= request.max_height!));
  }

  formats.sort((a, b) => {
    const typeA = (a.type ?? "").toLowerCase();
    const typeB = (b.type ?? "").toLowerCase();
    if (typeA !== typeB) return typeA < typeB ? -1 : 1;
    return (a.name ?? "").localeCompare(b.name ?? "");
  });

  const response: ListCreativeFormatsResponse = {
    formats,
    creative_agents: discovered.creative_agents,
    errors: discovered.errors.length > 0 ? discovered.errors : null,
    context: request.context,
  };
  ListCreativeFormatsResponseSchema.parse(response);
  return response;
}
