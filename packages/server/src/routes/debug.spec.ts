/**
 * Route tests for debug endpoints.
 *
 * Legacy equivalent: _legacy/src/core/main.py → debug_db_state, debug_tenant,
 *   debug_root, debug_landing, debug_root_logic
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildApp } from "../app.js";

vi.mock("../auth/validateActiveTenant.js", () => ({
  validateActiveTenantByVirtualHost: vi.fn(),
  validateActiveTenantBySubdomain: vi.fn(),
}));

import {
  validateActiveTenantBySubdomain,
  validateActiveTenantByVirtualHost,
} from "../auth/validateActiveTenant.js";

describe("GET /debug/db-state", () => {
  const originalEnv = process.env["ADCP_TESTING"];

  afterEach(() => {
    process.env["ADCP_TESTING"] = originalEnv;
  });

  it("returns 403 when ADCP_TESTING is not 'true'", async () => {
    process.env["ADCP_TESTING"] = "false";
    const app = await buildApp({ logger: false });

    const res = await app.inject({ method: "GET", url: "/debug/db-state" });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: "Only available in testing mode" });
  });
});

describe("GET /debug/tenant", () => {
  beforeEach(() => {
    vi.mocked(validateActiveTenantByVirtualHost).mockResolvedValue(null);
    vi.mocked(validateActiveTenantBySubdomain).mockResolvedValue(null);
  });

  it("returns 200 with tenant_id null when no tenant matches", async () => {
    const app = await buildApp({ logger: false });

    const res = await app.inject({
      method: "GET",
      url: "/debug/tenant",
      headers: { host: "localhost" },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.tenant_id).toBeNull();
    expect(body).toHaveProperty("apx_incoming_host");
    expect(body).toHaveProperty("host");
  });

  it("returns 200 with X-Tenant-Id when tenant found by virtual host", async () => {
    vi.mocked(validateActiveTenantByVirtualHost).mockResolvedValue({
      tenantId: "acme",
      name: "Acme",
      isActive: true,
    } as never);

    const app = await buildApp({ logger: false });

    const res = await app.inject({
      method: "GET",
      url: "/debug/tenant",
      headers: { "apx-incoming-host": "adcp.acme.com" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["x-tenant-id"]).toBe("acme");
    expect(res.json()).toMatchObject({
      tenant_id: "acme",
      tenant_name: "Acme",
      detection_method: "apx-incoming-host",
    });
  });
});

describe("GET /debug/root", () => {
  beforeEach(() => {
    vi.mocked(validateActiveTenantByVirtualHost).mockResolvedValue(null);
  });

  it("returns 200 with tenant_found false when no virtual host", async () => {
    const app = await buildApp({ logger: false });

    const res = await app.inject({
      method: "GET",
      url: "/debug/root",
      headers: {},
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.tenant_found).toBe(false);
    expect(body).toHaveProperty("virtual_host");
    expect(body).toHaveProperty("all_headers");
  });
});

describe("GET /debug/landing", () => {
  beforeEach(() => {
    vi.mocked(validateActiveTenantByVirtualHost).mockResolvedValue(null);
  });

  it("returns 404 when no tenant found", async () => {
    const app = await buildApp({ logger: false });

    const res = await app.inject({
      method: "GET",
      url: "/debug/landing",
      headers: { host: "unknown.example.com" },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: "No tenant found" });
  });

  it("returns 200 HTML when tenant found", async () => {
    vi.mocked(validateActiveTenantByVirtualHost).mockResolvedValue({
      tenantId: "acme",
      name: "Acme Corp",
      isActive: true,
    } as never);

    const app = await buildApp({ logger: false });

    const res = await app.inject({
      method: "GET",
      url: "/debug/landing",
      headers: { host: "adcp.acme.com" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/html/);
    expect(res.payload).toContain("Acme Corp");
  });
});

describe("GET /debug/root-logic", () => {
  beforeEach(() => {
    vi.mocked(validateActiveTenantByVirtualHost).mockResolvedValue(null);
  });

  it("returns 200 with step and would_return", async () => {
    const app = await buildApp({ logger: false });

    const res = await app.inject({
      method: "GET",
      url: "/debug/root-logic",
      headers: {},
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty("step");
    expect(body).toHaveProperty("would_return");
  });
});
