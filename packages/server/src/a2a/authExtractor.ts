/**
 * A2A-specific token extraction; create ToolContext or MinimalContext when no token.
 *
 * Legacy equivalent: _legacy/src/a2a_server/adcp_a2a_server.py
 *   _create_tool_context_from_a2a() — resolve tenant/principal from token; MinimalContext for discovery.
 */
import type { HeaderBag } from "../auth/resolveTenantFromHost.js";
import { buildToolContext } from "../auth/toolContext.js";
import type { ToolContext } from "../auth/toolContext.js";
import { lookupPrincipalGlobal } from "../auth/lookupPrincipal.js";
import { ServerError } from "./dispatcher.js";

/** Minimal context when no auth token is provided (e.g. discovery endpoints). */
export interface MinimalContext {
  type: "minimal";
  headers: HeaderBag;
}

/** Either a full ToolContext (authenticated) or MinimalContext (no token). */
export type A2AContext = ToolContext | MinimalContext;

/**
 * Create context for an A2A skill invocation.
 * When authToken is null, returns MinimalContext (headers only).
 * When authToken is present, looks up principal and returns a full ToolContext.
 * @throws ServerError when token is provided but invalid (principal not found).
 */
export async function createA2AContext(
  authToken: string | null,
  headers: HeaderBag,
  toolName: string,
): Promise<A2AContext> {
  if (!authToken || !authToken.trim()) {
    return { type: "minimal", headers };
  }

  const result = await lookupPrincipalGlobal(authToken.trim());
  if (!result) {
    throw new ServerError(
      -32600,
      "Invalid authentication token (not found or tenant inactive)",
    );
  }

  return buildToolContext(
    { tenantId: result.tenantId, principalId: result.principalId },
    toolName,
    { metadata: { source: "a2a_server", protocol: "a2a_jsonrpc" } },
  );
}

/**
 * Type guard: true when context is a full ToolContext (authenticated).
 */
export function isToolContext(ctx: A2AContext): ctx is ToolContext {
  return "tenantId" in ctx && "principalId" in ctx;
}
