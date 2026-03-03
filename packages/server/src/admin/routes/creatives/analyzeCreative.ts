import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { requireTenantAccess } from "../../services/authGuard.js";

function parseDimensionsFromText(text: string): { width: number; height: number } | null {
  const match = text.match(/(\d{2,5})\s*[xX]\s*(\d{2,5})/);
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (width <= 0 || height <= 0) return null;
  return { width, height };
}

function parseDimensionsFromUrl(urlObj: URL): { width: number; height: number } | null {
  const qsCandidates = [
    `${urlObj.searchParams.get("width") ?? ""}x${urlObj.searchParams.get("height") ?? ""}`,
    `${urlObj.searchParams.get("w") ?? ""}x${urlObj.searchParams.get("h") ?? ""}`,
    urlObj.searchParams.get("size") ?? "",
    urlObj.searchParams.get("dimensions") ?? "",
  ];
  for (const candidate of qsCandidates) {
    const dims = parseDimensionsFromText(candidate);
    if (dims) return dims;
  }

  const pathDims = parseDimensionsFromText(urlObj.pathname);
  if (pathDims) return pathDims;
  return null;
}

function inferAssetType(pathname: string): "image" | "video" | "html" | "unknown" {
  const lower = pathname.toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp|avif|svg)$/.test(lower)) return "image";
  if (/\.(mp4|webm|mov|m4v)$/.test(lower)) return "video";
  if (/\.(html|htm)$/.test(lower)) return "html";
  return "unknown";
}

function parseCreativeSpec(url: string): Record<string, unknown> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { success: false, error: "Invalid URL format", url };
  }

  const dimensions = parseDimensionsFromUrl(parsed);
  const assetType = inferAssetType(parsed.pathname);
  const extensionMatch = parsed.pathname.toLowerCase().match(/\.([a-z0-9]+)$/);
  const extension = extensionMatch?.[1] ?? null;

  const formatId = dimensions ? `${dimensions.width}x${dimensions.height}` : null;

  return {
    success: true,
    url,
    format_id: formatId,
    width: dimensions?.width ?? null,
    height: dimensions?.height ?? null,
    asset_type: assetType,
    extension,
    hostname: parsed.hostname,
  };
}

const analyzeCreativeRoute: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  fastify.post("/tenant/:id/creatives/analyze", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    request.auditOperation = "analyze";

    const body = (request.body ?? {}) as Record<string, unknown>;
    const url = typeof body.url === "string" ? body.url.trim() : "";
    if (!url) {
      return reply.code(400).send({ error: "URL is required" });
    }

    try {
      const result = parseCreativeSpec(url);
      if (typeof result.error === "string" && result.error) {
        return reply.code(400).send({ error: result.error });
      }
      return reply.send(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return reply.code(500).send({ error: message });
    }
  });
};

export default analyzeCreativeRoute;
