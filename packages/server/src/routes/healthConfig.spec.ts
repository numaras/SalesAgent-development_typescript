/**
 * Route tests for GET /health/config.
 *
 * Legacy equivalent: _legacy/src/core/main.py → health_config()
 *   Success: 200 with status/service/component/message; error: 500 with status/service/component/error.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildApp } from "../app.js";
import {
  HealthConfigErrorSchema,
  HealthConfigSuccessSchema,
} from "../schemas/healthConfig.js";

vi.mock("../startup/validateStartupRequirements.js", () => ({
  validateStartupRequirements: vi.fn(),
}));

import { validateStartupRequirements } from "../startup/validateStartupRequirements.js";

describe("GET /health/config", () => {
  beforeEach(() => {
    vi.mocked(validateStartupRequirements).mockReset();
  });

  it("returns 200 with success body when validation passes", async () => {
    vi.mocked(validateStartupRequirements).mockReturnValue(undefined);

    const app = await buildApp({ logger: false });

    const res = await app.inject({
      method: "GET",
      url: "/health/config",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(HealthConfigSuccessSchema.safeParse(body).success).toBe(true);
    expect(body).toMatchObject({
      status: "healthy",
      service: "mcp",
      component: "configuration",
      message: "All configuration validation passed",
    });
  });

  it("returns 500 with error body when validation throws", async () => {
    vi.mocked(validateStartupRequirements).mockImplementation(() => {
      throw new Error("Config load failed");
    });

    const app = await buildApp({ logger: false });

    const res = await app.inject({
      method: "GET",
      url: "/health/config",
    });

    expect(res.statusCode).toBe(500);
    const body = res.json();
    expect(HealthConfigErrorSchema.safeParse(body).success).toBe(true);
    expect(body).toMatchObject({
      status: "unhealthy",
      service: "mcp",
      component: "configuration",
      error: "Config load failed",
    });
  });
});
