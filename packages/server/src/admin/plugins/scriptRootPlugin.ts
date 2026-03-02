/**
 * Script root plugin. Parity with _legacy CustomProxyFix (X-Script-Name / X-Forwarded-Prefix).
 * 1. Reads X-Script-Name or X-Forwarded-Prefix header and sets request.scriptRoot.
 * 2. PRODUCTION fallback: no header + PRODUCTION=true + no APX_INCOMING_HOST → defaults to /admin.
 * 3. Rewrites request.url to strip the script_name prefix (PATH_INFO parity).
 * 4. onSend hook: prepends script_name to 3xx Location headers that start with /.
 */
import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    scriptRoot?: string;
  }
}

function getHeader(headers: Record<string, string | string[] | undefined>, name: string): string {
  const v = headers[name];
  if (!v) return "";
  return Array.isArray(v) ? (v[0] ?? "") : v;
}

const DEFAULT_SCRIPT_NAME = "/admin";

const scriptRootPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.decorateRequest("scriptRoot", "");

  fastify.addHook("onRequest", async (request: FastifyRequest) => {
    let scriptName =
      getHeader(request.headers, "x-script-name") ||
      getHeader(request.headers, "x-forwarded-prefix") ||
      "";

    // PRODUCTION fallback: mirror Python CustomProxyFix L73-79.
    // When no header is present and PRODUCTION=true and this is NOT a custom-domain request
    // (no APX_INCOMING_HOST), fall back to the default /admin script root.
    if (!scriptName && process.env["PRODUCTION"] === "true") {
      const apxHost = getHeader(request.headers, "apx-incoming-host");
      if (!apxHost) {
        scriptName = DEFAULT_SCRIPT_NAME;
      }
    }

    const req = request as FastifyRequest & { scriptRoot: string };
    const normalized = scriptName.trim().replace(/\/$/, "");
    req.scriptRoot = normalized;

    // PATH_INFO rewriting: strip the script_name prefix from request.url so routes match
    // without the prefix — mirrors Python CustomProxyFix L87-91.
    if (normalized && request.url.startsWith(normalized)) {
      const stripped = request.url.slice(normalized.length) || "/";
      (request.raw as { url?: string }).url = stripped;
      // @ts-expect-error Fastify caches the parsed url; reset it so the router sees the stripped path.
      request.url = stripped;
    }
  });

  // Redirect Location fixup: prepend script_name to 3xx Location headers that start with /
  // but are not already prefixed — mirrors Python CustomProxyFix L95-110.
  fastify.addHook("onSend", async (request, reply, payload) => {
    const scriptRoot = (request as FastifyRequest & { scriptRoot: string }).scriptRoot;
    if (!scriptRoot) return payload;

    const statusCode = reply.statusCode;
    if (statusCode < 300 || statusCode >= 400) return payload;

    const location = reply.getHeader("location");
    if (typeof location !== "string") return payload;

    if (location.startsWith("/") && !location.startsWith(scriptRoot) && !location.includes("://")) {
      reply.header("location", scriptRoot + location);
    }

    return payload;
  });
};

export default scriptRootPlugin;
