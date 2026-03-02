/**
 * Zod schemas for the GET /health endpoint.
 *
 * Legacy equivalent: _legacy/src/core/main.py → health()
 *   Returns: `{"status": "healthy", "service": "mcp"}`
 *
 * The schema is used by both the route handler (for serialisation) and
 * route tests (for type-safe assertion).
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Response schema
// ---------------------------------------------------------------------------

export const HealthResponseSchema = z.object({
  /** Always "healthy" for a running server. */
  status: z.literal("healthy"),
  /** Identifies the service type. Always "mcp" for this server. */
  service: z.literal("mcp"),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

// ---------------------------------------------------------------------------
// Constant response value (no computation required)
// ---------------------------------------------------------------------------

export const HEALTH_RESPONSE: HealthResponse = {
  status: "healthy",
  service: "mcp",
} as const;
