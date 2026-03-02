/**
 * Token extraction from HTTP request headers.
 *
 * Legacy equivalent: _legacy/src/core/auth.py → get_principal_from_context()
 *   lines 304-322 (token extraction block)
 *
 * Extraction priority (matches legacy exactly):
 *   1. `x-adcp-auth` header (preferred, AdCP-specific)
 *   2. `Authorization: Bearer <token>` (standard HTTP, for Anthropic / generic MCP clients)
 *
 * HTTP headers are case-insensitive (RFC 7230 §3.2). Fastify lowercases all
 * header names by default, so `headers["x-adcp-auth"]` works without extra
 * normalisation. We still do a case-insensitive scan for `Authorization` to
 * support callers that pass raw Node.js IncomingMessage headers.
 */

export interface TokenExtractionResult {
  token: string;
  /** Header that the token was sourced from — useful for debug logging. */
  source: "x-adcp-auth" | "authorization-bearer";
}

/**
 * Extract a raw auth token from HTTP headers.
 *
 * @returns The extracted token and its source, or `null` if no token is present.
 */
export function extractToken(
  headers: Record<string, string | string[] | undefined>,
): TokenExtractionResult | null {
  // 1. x-adcp-auth (Fastify lowercases headers, so this always matches)
  const adcpAuth = getHeader(headers, "x-adcp-auth");
  if (adcpAuth) {
    return { token: adcpAuth, source: "x-adcp-auth" };
  }

  // 2. Authorization: Bearer <token>
  //    RFC 6750 — accept case-insensitive "Bearer" prefix per legacy behaviour.
  const authorization = getHeader(headers, "authorization");
  if (authorization) {
    const lower = authorization.toLowerCase();
    if (lower.startsWith("bearer ")) {
      const token = authorization.slice(7).trim();
      if (token) {
        return { token, source: "authorization-bearer" };
      }
    }
  }

  return null;
}

/**
 * Case-insensitive single-value header lookup.
 * Fastify lowercases all header names, but this guard handles raw Node.js headers too.
 */
function getHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | null {
  // Fast path: Fastify always lowercases
  const direct = headers[name];
  if (direct !== undefined) {
    return Array.isArray(direct) ? (direct[0] ?? null) : direct;
  }

  // Fallback: linear scan for non-lowercased headers (e.g. tests, raw Node.js)
  const nameLower = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === nameLower && value !== undefined) {
      return Array.isArray(value) ? (value[0] ?? null) : value;
    }
  }

  return null;
}
