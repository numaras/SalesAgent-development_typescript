/**
 * ToolContext — the clean context object passed to every MCP tool handler.
 *
 * Legacy equivalent: _legacy/src/core/tool_context.py → class ToolContext(BaseModel)
 *
 * Design goals (mirrors legacy intent):
 *   - Single, immutable value passed into a tool call — no global state inside a tool
 *   - Contains everything a tool needs: identifiers, conversation history, metadata
 *   - Carries optional testing hooks so tools can behave deterministically in tests
 *   - Utility helpers (isAsyncOperation, addToHistory) available as pure functions
 *     to keep the type a plain data object (easier to mock in tests)
 *
 * Relationship to authPlugin:
 *   authPlugin populates `request.auth = { principalId, tenantId }`.
 *   A route handler then calls `buildToolContext(request.auth, toolName)` to
 *   produce a ToolContext before delegating to a service function.
 */

// ---------------------------------------------------------------------------
// AdCPTestContext — minimal port of _legacy/src/core/testing_hooks.py
// ---------------------------------------------------------------------------

/**
 * AdCP-standard testing hooks transported via request headers.
 * Full spec: https://adcontextprotocol.org/docs/media-buy/testing/
 *
 * Legacy equivalent: _legacy/src/core/testing_hooks.py → AdCPTestContext
 */
export interface AdCPTestContext {
  /** X-Test-Session-ID — isolates test sessions from each other. */
  testSessionId: string | null;
  /** X-Dry-Run — execute without affecting production state. */
  dryRun: boolean;
  /** X-Mock-Time — ISO-8601 timestamp that overrides "now". */
  mockTime: string | null;
  /** X-Jump-To-Event — campaign lifecycle event to jump to. */
  jumpToEvent: string | null;
  /** X-Auto-Advance — automatically advance through campaign events. */
  autoAdvance: boolean;
  /** X-Simulated-Spend — track simulated spending (no real money). */
  simulatedSpend: number | null;
}

// ---------------------------------------------------------------------------
// ToolContext
// ---------------------------------------------------------------------------

/**
 * Immutable context passed to every MCP/A2A tool handler.
 *
 * Legacy equivalent: _legacy/src/core/tool_context.py → class ToolContext
 */
export interface ToolContext {
  // --- Core identifiers -------------------------------------------------------
  /** Unique conversation / session ID (correlates requests in a session). */
  contextId: string;
  /** Tenant this request belongs to. */
  tenantId: string;
  /** Principal (advertiser / agency) making the request. */
  principalId: string;

  // --- Conversation state -----------------------------------------------------
  /** Previous messages in this conversation. Populated by the session layer. */
  conversationHistory: Array<Record<string, unknown>>;

  // --- Request metadata -------------------------------------------------------
  /** Name of the MCP or A2A tool being invoked. */
  toolName: string;
  /** Wall-clock time when this request arrived at the server. */
  requestTimestamp: Date;

  // --- Optional extras --------------------------------------------------------
  /** Arbitrary metadata (e.g. MCP client version, debug flags). */
  metadata: Record<string, unknown>;
  /**
   * AdCP testing hooks extracted from request headers.
   * Null in normal production requests.
   */
  testingContext: AdCPTestContext | null;
  /** Workflow ID if this tool call is part of a persistent workflow. */
  workflowId: string | null;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Build a ToolContext from the minimal information available at request time.
 * Conversation history and workflow tracking are set to empty/null by default;
 * the session layer can augment them if needed.
 */
export function buildToolContext(
  auth: { principalId: string; tenantId: string },
  toolName: string,
  overrides: Partial<Pick<ToolContext, "contextId" | "conversationHistory" | "metadata" | "testingContext" | "workflowId">> = {},
): ToolContext {
  return {
    contextId: overrides.contextId ?? crypto.randomUUID(),
    tenantId: auth.tenantId,
    principalId: auth.principalId,
    conversationHistory: overrides.conversationHistory ?? [],
    toolName,
    requestTimestamp: new Date(),
    metadata: overrides.metadata ?? {},
    testingContext: overrides.testingContext ?? null,
    workflowId: overrides.workflowId ?? null,
  };
}

// ---------------------------------------------------------------------------
// Utility helpers (pure functions — no side effects)
// ---------------------------------------------------------------------------

/**
 * Returns true when this tool call is part of a persistent async workflow.
 * Legacy: ToolContext.is_async_operation()
 */
export function isAsyncOperation(ctx: ToolContext): boolean {
  return ctx.workflowId !== null;
}

/**
 * Immutably appends a message to the conversation history.
 * Returns a new ToolContext — does NOT mutate the original.
 *
 * Legacy: ToolContext.add_to_history() (mutating in Python; we keep it pure here)
 */
export function addToHistory(
  ctx: ToolContext,
  message: Record<string, unknown>,
): ToolContext {
  return {
    ...ctx,
    conversationHistory: [
      ...ctx.conversationHistory,
      { ...message, timestamp: new Date().toISOString() },
    ],
  };
}
