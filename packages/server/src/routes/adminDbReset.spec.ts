/**
 * Route tests for POST /admin/reset-db-pool.
 *
 * Legacy equivalent: _legacy/src/core/main.py → reset_db_pool()
 *   Testing-only; 403 when ADCP_TESTING !== 'true'; 200 on success; 500 on reset failure.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildApp } from "../app.js";

vi.mock("../db/client.js", () => ({
  resetDbPool: vi.fn(),
}));

import { resetDbPool } from "../db/client.js";

describe("POST /admin/reset-db-pool", () => {
  const originalEnv = process.env["ADCP_TESTING"];

  afterEach(() => {
    vi.mocked(resetDbPool).mockReset();
    process.env["ADCP_TESTING"] = originalEnv;
  });

  it("returns 403 when ADCP_TESTING is not 'true'", async () => {
    process.env["ADCP_TESTING"] = "false";

    const app = await buildApp({ logger: false });

    const res = await app.inject({
      method: "POST",
      url: "/admin/reset-db-pool",
    });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({
      error: "This endpoint is only available in testing mode",
    });
    expect(resetDbPool).not.toHaveBeenCalled();
  });

  it("returns 403 when ADCP_TESTING is unset", async () => {
    delete process.env["ADCP_TESTING"];

    const app = await buildApp({ logger: false });

    const res = await app.inject({
      method: "POST",
      url: "/admin/reset-db-pool",
    });

    expect(res.statusCode).toBe(403);
    expect(resetDbPool).not.toHaveBeenCalled();
  });

  it("returns 200 with success body when ADCP_TESTING is 'true' and reset succeeds", async () => {
    process.env["ADCP_TESTING"] = "true";
    vi.mocked(resetDbPool).mockResolvedValue(undefined);

    const app = await buildApp({ logger: false });

    const res = await app.inject({
      method: "POST",
      url: "/admin/reset-db-pool",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      status: "success",
      message:
        "Database connection pool and tenant context reset successfully",
    });
    expect(resetDbPool).toHaveBeenCalledOnce();
  });

  it("returns 500 with error body when resetDbPool throws", async () => {
    process.env["ADCP_TESTING"] = "true";
    vi.mocked(resetDbPool).mockRejectedValue(new Error("Pool reset failed"));

    const app = await buildApp({ logger: false });

    const res = await app.inject({
      method: "POST",
      url: "/admin/reset-db-pool",
    });

    expect(res.statusCode).toBe(500);
    expect(res.json()).toMatchObject({
      error: "Failed to reset: Pool reset failed",
    });
  });
});
