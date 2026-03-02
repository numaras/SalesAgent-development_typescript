import { createRequire } from "module";

import { getRegisteredSkillNames } from "../a2a/dispatcher.js";
import type { AgentCard } from "../schemas/a2a.js";

const _require = createRequire(import.meta.url);
const pkg = _require("../../package.json") as { version: string };

const VERSION: string = pkg.version;
const PROTOCOL_VERSION = "1.0";
const ADCP_PROTOCOL_VERSION = "2.5.0";

const SKILL_METADATA: Record<string, { description: string; tags: string[] }> = {
  get_adcp_capabilities: {
    description:
      "Get the capabilities of this AdCP sales agent including supported protocols and targeting",
    tags: ["capabilities", "discovery", "adcp"],
  },
  get_products: {
    description: "Browse available advertising products and inventory",
    tags: ["products", "inventory", "catalog", "adcp"],
  },
  create_media_buy: {
    description:
      "Create advertising campaigns with products, targeting, and budget",
    tags: ["campaign", "media", "buy", "adcp"],
  },
  list_creative_formats: {
    description: "List all available creative formats and specifications",
    tags: ["creative", "formats", "specs", "discovery", "adcp"],
  },
  list_authorized_properties: {
    description:
      "List authorized properties this agent can sell advertising for",
    tags: ["properties", "authorization", "publisher", "adcp"],
  },
  update_media_buy: {
    description: "Update existing media buy configuration and settings",
    tags: ["campaign", "update", "management", "adcp"],
  },
  get_media_buy_delivery: {
    description: "Get delivery metrics and performance data for media buys",
    tags: ["delivery", "metrics", "performance", "monitoring", "adcp"],
  },
  update_performance_index: {
    description: "Update performance data and optimization metrics",
    tags: ["performance", "optimization", "metrics", "adcp"],
  },
  sync_creatives: {
    description:
      "Upload and manage creative assets to centralized library (AdCP spec)",
    tags: ["creative", "sync", "library", "adcp", "spec"],
  },
  list_creatives: {
    description:
      "Search and query creative library with advanced filtering (AdCP spec)",
    tags: ["creative", "library", "search", "adcp", "spec"],
  },
  approve_creative: {
    description: "Review and approve/reject creative assets (admin only)",
    tags: ["creative", "approval", "review", "adcp"],
  },
  get_media_buy_status: {
    description: "Check status and performance of media buys",
    tags: ["status", "performance", "tracking", "adcp"],
  },
  optimize_media_buy: {
    description: "Optimize media buy performance and targeting",
    tags: ["optimization", "performance", "targeting", "adcp"],
  },
};

export function buildBaseUrl(headers: {
  "apx-incoming-host"?: string | string[];
  "x-forwarded-proto"?: string | string[];
  "x-forwarded-host"?: string | string[];
  host?: string | string[];
  [key: string]: string | string[] | undefined;
}): string {
  const apxHost =
    typeof headers["apx-incoming-host"] === "string"
      ? headers["apx-incoming-host"]
      : undefined;

  if (apxHost) {
    const protocol =
      apxHost.startsWith("localhost") || apxHost.startsWith("127.0.0.1")
        ? "http"
        : "https";
    return `${protocol}://${apxHost}/a2a`;
  }

  const protocol = headers["x-forwarded-proto"] ?? "http";
  const host =
    (headers["x-forwarded-host"] as string | undefined) ??
    (headers.host as string | undefined) ??
    "localhost:8080";

  return `${String(protocol)}://${host}/a2a`;
}

export function buildAgentCard(baseUrl: string): AgentCard {
  const skillIds = getRegisteredSkillNames();

  return {
    name: "Prebid Sales Agent",
    description:
      "AI agent for programmatic advertising campaigns via AdCP protocol",
    version: VERSION,
    protocol_version: PROTOCOL_VERSION,
    url: baseUrl,
    documentation_url: "https://github.com/prebid/salesagent",
    capabilities: {
      push_notifications: true,
      extensions: [
        {
          uri: `https://adcontextprotocol.org/schemas/${ADCP_PROTOCOL_VERSION}/protocols/adcp-extension.json`,
          description: "AdCP protocol version and supported domains",
          params: {
            adcp_version: ADCP_PROTOCOL_VERSION,
            protocols_supported: ["media_buy"],
          },
        },
      ],
    },
    default_input_modes: ["message"],
    default_output_modes: ["message"],
    skills: skillIds.map((id) => {
      const metadata = SKILL_METADATA[id];
      return {
        id,
        name: id,
        description: metadata?.description ?? `AdCP skill: ${id}`,
        tags: metadata?.tags ?? ["adcp"],
      };
    }),
  };
}
