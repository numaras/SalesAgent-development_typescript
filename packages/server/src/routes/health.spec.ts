/**
 * Route tests for GET /health.
 *
 * Legacy equivalent: _legacy/src/core/main.py → health()
 *   Returns 200 with {"status": "healthy", "service": "mcp"}.
 */
import { describe, expect, it } from "vitest";

import { buildApp } from "../app.js";
import { HealthResponseSchema } from "../schemas/health.js";

describe("GET /health", () => {
  it("returns 200 with status healthy and service mcp", async () => {
    const app = await buildApp({ logger: false });

    const res = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(HealthResponseSchema.safeParse(body).success).toBe(true);
    expect(body).toEqual({ status: "healthy", service: "mcp" });
  });

  it("does not require authentication", async () => {
    const app = await buildApp({ logger: false });

    const res = await app.inject({
      method: "GET",
      url: "/health",
      headers: {},
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: "healthy", service: "mcp" });
  });
});
