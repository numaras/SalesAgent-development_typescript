/**
 * Per-request async context store backed by Node.js AsyncLocalStorage.
 *
 * Legacy equivalent: _legacy/src/core/config_loader.py
 *   - `current_tenant: ContextVar` (lines 57-58)
 *   - `get_current_tenant()` (lines 60-101)
 *   - `set_current_tenant()` (lines 184-186)
 *
 * Python uses `contextvars.ContextVar` which provides automatic async isolation.
 * Node.js uses `AsyncLocalStorage` from `node:async_hooks` for the same guarantee:
 * each async call-chain that starts with `runWithRequestContext()` gets its own
 * independent store. Concurrently running requests do NOT share state.
 *
 * SECURITY NOTE (matches legacy):
 *   `getRequestContext()` throws `RequestContextError` if called before the context
 *   has been populated. This is intentional — silently falling back to a default
 *   tenant would be a critical tenant-isolation breach.
 *
 * Usage in a Fastify route:
 *
 *   ```ts
 *   // In authPlugin (preHandler hook) — already done:
 *   request.auth = { principalId, tenantId };
 *
 *   // In a route handler that needs context propagated to sync helper functions:
 *   app.get('/some-route', async (request, reply) => {
 *     await runWithRequestContext(
 *       { tenantId: request.auth!.tenantId, principalId: request.auth!.principalId },
 *       async () => {
 *         const ctx = getRequestContext(); // safe here
 *         return doWork(ctx);
 *       }
 *     );
 *   });
 *   ```
 */
import { AsyncLocalStorage } from "node:async_hooks";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The data stored per request in async-local storage.
 *
 * Extends the minimal auth context (principalId + tenantId) with the full
 * tenant row so callers can read tenant config without extra DB round-trips.
 */
export interface RequestContext {
  tenantId: string;
  principalId: string | null;
  /** The full tenant DB row, set when available (e.g. from authPlugin). */
  tenantRow?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Custom error
// ---------------------------------------------------------------------------

/**
 * Thrown when `getRequestContext()` is called outside an active request scope.
 *
 * Legacy equivalent: `RuntimeError("No tenant context set…")` in config_loader.py
 */
export class RequestContextError extends Error {
  constructor(message = "No request context set. Ensure the auth plugin has run before calling getRequestContext().") {
    super(message);
    this.name = "RequestContextError";
  }
}

// ---------------------------------------------------------------------------
// AsyncLocalStorage singleton
// ---------------------------------------------------------------------------

const _store = new AsyncLocalStorage<RequestContext>();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run `fn` with `context` bound to the current async call-chain.
 *
 * Any `await`-ed code inside `fn` can call `getRequestContext()` safely.
 * Code outside this call-chain sees no context (as intended).
 */
export function runWithRequestContext<T>(
  context: RequestContext,
  fn: () => T | Promise<T>,
): Promise<T> {
  return _store.run(context, fn as () => Promise<T>);
}

/**
 * Retrieve the request context for the current async scope.
 *
 * @throws {RequestContextError} if no context has been set (indicates a bug —
 *   the function was called before `runWithRequestContext` was entered, e.g.
 *   by calling a service function directly in a test without wrapping it).
 */
export function getRequestContext(): RequestContext {
  const ctx = _store.getStore();
  if (!ctx) {
    throw new RequestContextError();
  }
  return ctx;
}

/**
 * Returns the request context if present, or `null` if outside a request scope.
 * Prefer `getRequestContext()` in production code; use this only in edge cases
 * (e.g. background tasks, startup scripts) where context may legitimately be absent.
 */
export function tryGetRequestContext(): RequestContext | null {
  return _store.getStore() ?? null;
}
