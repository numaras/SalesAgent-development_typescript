/**
 * Fastify auth plugin — resolves tenant + principal on every request.
 *
 * Legacy equivalent: _legacy/src/core/auth.py → get_principal_from_context()
 *   + the middleware applied in _legacy/src/core/main.py
 *
 * Behaviour (mirrors legacy exactly):
 *
 *   1. Tenant detection (in priority order):
 *      a. `Host` / `Apx-Incoming-Host` header → virtual-host lookup
 *      b. `Host` header → subdomain extraction → subdomain lookup
 *      c. `x-adcp-tenant` header → subdomain lookup, then direct tenant_id
 *      d. `Apx-Incoming-Host` → virtual-host lookup
 *      e. localhost / 127.0.0.1 → "default" tenant (dev fallback)
 *
 *   2. Token extraction:
 *      a. `x-adcp-auth` (preferred)
 *      b. `Authorization: Bearer <token>` (standard MCP clients)
 *
 *   3. Principal resolution:
 *      - Tenant known  → lookupPrincipalByToken then checkAdminToken fallback
 *      - Tenant unknown → lookupPrincipalGlobal (sets tenant as side-effect)
 *
 *   4. Result:
 *      - Token present + valid principal  → `request.auth = { principalId, tenantId }`
 *      - Token present + invalid          → 401 reply (or null if requireAuth=false)
 *      - No token                         → `request.auth = null` (public endpoints OK)
 *
 * Registration:
 *   Register once at the root app BEFORE any protected routes:
 *
 *   ```ts
 *   await app.register(authPlugin);
 *   ```
 *
 *   To mark a route as requiring authentication call `request.requireAuth()`.
 *   Guards that need auth should check `request.auth !== null` or call the helper.
 */
import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from "fastify";

import { checkAdminToken } from "./adminTokenFallback.js";
import { extractToken } from "./extractToken.js";
import { lookupPrincipalByToken, lookupPrincipalGlobal } from "./lookupPrincipal.js";
import { resolveTenantId } from "./resolveTenantFromHost.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthContext {
  principalId: string;
  tenantId: string;
}

// Extend Fastify's request type to include our auth decoration.
declare module "fastify" {
  interface FastifyRequest {
    /** Populated by authPlugin after a successful token lookup. Null if no token. */
    auth: AuthContext | null;
  }
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

const authPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Decorate every request with a null auth context (overwritten on success).
  fastify.decorateRequest("auth", null);

  fastify.addHook("preHandler", async (request, reply) => {
    // --- Token extraction ---------------------------------------------------
    const tokenResult = extractToken(request.headers as Record<string, string | string[] | undefined>);

    // --- Tenant resolution --------------------------------------------------
    const tenantId = await resolveTenantId(request.headers as Record<string, string | string[] | undefined>);

    if (!tokenResult) {
      // No auth token → public/unauthenticated request is allowed.
      // Routes that require auth must check `request.auth !== null` themselves.
      return;
    }

    const { token } = tokenResult;

    // --- Principal lookup ---------------------------------------------------
    let principalId: string | null = null;

    if (tenantId) {
      // Tenant-scoped lookup: try normal principal first, then admin token fallback.
      principalId = await lookupPrincipalByToken(token, tenantId);

      if (!principalId) {
        principalId = await checkAdminToken(token, tenantId);
      }
    } else {
      // Global lookup: token determines the tenant.
      const result = await lookupPrincipalGlobal(token);
      if (result) {
        principalId = result.principalId;
        // We now have a tenant — re-assign so the auth context is complete.
        request.auth = { principalId: result.principalId, tenantId: result.tenantId };
        return;
      }
    }

    // --- Auth decision ------------------------------------------------------
    if (!principalId) {
      // Token was present but invalid → 401 Unauthorized.
      await reply
        .code(401)
        .header("content-type", "application/json")
        .send({
          error: "INVALID_AUTH_TOKEN",
          message:
            `Authentication token is invalid for tenant '${tenantId ?? "any"}'. ` +
            "The token may be expired, revoked, or associated with a different tenant.",
        });
      return;
    }

    request.auth = { principalId, tenantId: tenantId! };
  });
};

export default authPlugin;
