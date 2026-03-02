/**
 * A2A skill dispatcher: map skill name → handler; return ServerError on unknown skill.
 *
 * Legacy equivalent: _legacy/src/a2a_server/adcp_a2a_server.py
 *   _handle_explicit_skill_invocation() — skill_handlers map, MethodNotFoundError for unknown.
 */

import type { A2AContext } from "./authExtractor.js";
import { createA2AContext } from "./authExtractor.js";
import type { HeaderBag } from "../auth/resolveTenantFromHost.js";

/** JSON-RPC / A2A server error (code, message, optional data). */
export class ServerError extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = "ServerError";
  }
}

/** JSON-RPC method not found (-32601). */
export const METHOD_NOT_FOUND_CODE = -32601;

export type SkillHandler = (
  params: Record<string, unknown>,
  authToken: string | null,
  context: A2AContext,
) => Promise<unknown>;

const skillHandlers = new Map<string, SkillHandler>();

/**
 * Register a skill handler. Called by skill modules (getProducts, etc.).
 */
export function registerSkill(name: string, handler: SkillHandler): void {
  skillHandlers.set(name, handler);
}

/**
 * Dispatch to the handler for the given skill name.
 * Builds A2AContext from authToken and headers, then invokes the handler.
 * @throws ServerError with METHOD_NOT_FOUND_CODE when skill is unknown
 */
export async function dispatch(
  skillName: string,
  params: Record<string, unknown>,
  authToken: string | null,
  headers?: HeaderBag,
): Promise<unknown> {
  const handler = skillHandlers.get(skillName);
  if (!handler) {
    const available = [...skillHandlers.keys()].sort();
    throw new ServerError(
      METHOD_NOT_FOUND_CODE,
      `Unknown skill '${skillName}'. Available skills: ${available.join(", ") || "(none)"}`,
      { available_skills: available },
    );
  }
  const context = await createA2AContext(
    authToken,
    headers ?? {},
    skillName,
  );
  return handler(params, authToken, context);
}

/**
 * Return the set of registered skill names (for tests and agent card).
 */
export function getRegisteredSkillNames(): string[] {
  return [...skillHandlers.keys()].sort();
}
