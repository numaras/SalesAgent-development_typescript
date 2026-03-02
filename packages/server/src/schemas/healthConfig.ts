/**
 * Zod schemas for the GET /health/config endpoint.
 *
 * Legacy equivalent: _legacy/src/core/main.py → health_config()
 *   Success: {"status": "healthy", "service": "mcp", "component": "configuration", "message": "All configuration validation passed"}
 *   Error (500): {"status": "unhealthy", "service": "mcp", "component": "configuration", "error": "<message>"}
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Success response
// ---------------------------------------------------------------------------

export const HealthConfigSuccessSchema = z.object({
  status: z.literal("healthy"),
  service: z.literal("mcp"),
  component: z.literal("configuration"),
  message: z.string(),
});

export type HealthConfigSuccess = z.infer<typeof HealthConfigSuccessSchema>;

// ---------------------------------------------------------------------------
// Error response (500)
// ---------------------------------------------------------------------------

export const HealthConfigErrorSchema = z.object({
  status: z.literal("unhealthy"),
  service: z.literal("mcp"),
  component: z.literal("configuration"),
  error: z.string(),
});

export type HealthConfigError = z.infer<typeof HealthConfigErrorSchema>;

// ---------------------------------------------------------------------------
// Union for route schema
// ---------------------------------------------------------------------------

export const HealthConfigResponseSchema = z.discriminatedUnion("status", [
  HealthConfigSuccessSchema,
  HealthConfigErrorSchema,
]);

export type HealthConfigResponse = z.infer<typeof HealthConfigResponseSchema>;
