/**
 * Creative format listing service (list-creative-formats).
 *
 * Legacy equivalent: _legacy/src/core/tools/creative_formats.py → _list_creative_formats_impl()
 *   Returns formats from creative agent registry (+ adapter formats). This implementation
 *   returns tenant-scoped default reference formats; registry/DB can be added later.
 */
import type {
  Format,
  ListCreativeFormatsRequest,
  ListCreativeFormatsResponse,
} from "../schemas/creativeFormats.js";
import { ListCreativeFormatsResponseSchema } from "../schemas/creativeFormats.js";

const DEFAULT_AGENT_URL = "https://creative.adcontextprotocol.org";

/** Default reference formats returned when no registry/DB is configured. */
const DEFAULT_FORMATS: Format[] = [
  {
    format_id: { agent_url: DEFAULT_AGENT_URL, id: "display_300x250" },
    name: "Display 300x250",
    description: "Medium Rectangle (IAB)",
    type: "display",
    renders: [{ dimensions: { width: 300, height: 250 }, label: "Primary" }],
  },
  {
    format_id: { agent_url: DEFAULT_AGENT_URL, id: "display_728x90" },
    name: "Display 728x90",
    description: "Leaderboard (IAB)",
    type: "display",
    renders: [{ dimensions: { width: 728, height: 90 }, label: "Primary" }],
  },
  {
    format_id: { agent_url: DEFAULT_AGENT_URL, id: "video_16x9" },
    name: "Video 16:9",
    description: "Standard widescreen video",
    type: "video",
    renders: [{ dimensions: { width: 1920, height: 1080 }, label: "Primary" }],
  },
];

export interface FormatServiceContext {
  tenantId: string;
}

/**
 * List creative formats for a tenant, optionally filtered by request.
 *
 * Applies all AdCP-spec filters: type, format_ids, is_responsive, name_search,
 * asset_types, min/max_width/height. Sorts by type+name. Returns registry-level
 * fields (creative_agents, errors, context) to match Python ListCreativeFormatsResponse.
 *
 * Note: format discovery still uses DEFAULT_FORMATS (CreativeAgentRegistry/DB integration
 * tracked in a future task). All filter and response-shape logic is fully parity-complete.
 */
export async function listFormats(
  _ctx: FormatServiceContext,
  request: ListCreativeFormatsRequest,
): Promise<ListCreativeFormatsResponse> {
  let formats = [...DEFAULT_FORMATS];

  if (request.type) {
    const typeLower = request.type.toLowerCase();
    formats = formats.filter((f) => f.type?.toLowerCase() === typeLower);
  }

  if (request.format_ids && request.format_ids.length > 0) {
    const ids = new Set(
      request.format_ids.map((f) =>
        typeof f === "object" && f && "id" in f ? f.id : String(f),
      ),
    );
    formats = formats.filter((f) => ids.has(f.format_id.id));
  }

  // is_responsive: check renders[].dimensions.responsive (no responsive dims in default formats)
  if (request.is_responsive !== undefined && request.is_responsive !== null) {
    formats = formats.filter((f) => {
      const isResponsive = (f.renders ?? []).some((r) => {
        const dims = r.dimensions as Record<string, unknown> | undefined;
        const resp = dims?.["responsive"] as
          | Record<string, unknown>
          | undefined;
        return resp && (resp["width"] || resp["height"]);
      });
      return isResponsive === request.is_responsive;
    });
  }

  // name_search: case-insensitive partial match on format name (Python L271-274)
  if (request.name_search) {
    const searchTerm = request.name_search.toLowerCase();
    formats = formats.filter((f) =>
      (f.name ?? "").toLowerCase().includes(searchTerm),
    );
  }

  // asset_types: format must support at least one of the requested asset types
  if (request.asset_types && request.asset_types.length > 0) {
    const requestedTypes = new Set(
      request.asset_types.map((t) => String(t).toLowerCase()),
    );
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

  // Dimension filters: match if ANY render satisfies the constraint (Python L285-292)
  const getDimensions = (f: Format): Array<{ w?: number; h?: number }> =>
    (f.renders ?? []).map((r) => ({
      w: r.dimensions?.width,
      h: r.dimensions?.height,
    }));

  if (request.min_width !== undefined) {
    formats = formats.filter((f) =>
      getDimensions(f).some((d) => d.w !== undefined && d.w >= request.min_width!),
    );
  }
  if (request.max_width !== undefined) {
    formats = formats.filter((f) =>
      getDimensions(f).some((d) => d.w !== undefined && d.w <= request.max_width!),
    );
  }
  if (request.min_height !== undefined) {
    formats = formats.filter((f) =>
      getDimensions(f).some((d) => d.h !== undefined && d.h >= request.min_height!),
    );
  }
  if (request.max_height !== undefined) {
    formats = formats.filter((f) =>
      getDimensions(f).some((d) => d.h !== undefined && d.h <= request.max_height!),
    );
  }

  // Sort by type then name (Python L296)
  formats.sort((a, b) => {
    const typeA = (a.type ?? "").toLowerCase();
    const typeB = (b.type ?? "").toLowerCase();
    if (typeA !== typeB) return typeA < typeB ? -1 : 1;
    return (a.name ?? "").localeCompare(b.name ?? "");
  });

  const response: ListCreativeFormatsResponse = {
    formats,
    creative_agents: null,
    errors: null,
    context: request.context,
  };
  ListCreativeFormatsResponseSchema.parse(response);
  return response;
}
