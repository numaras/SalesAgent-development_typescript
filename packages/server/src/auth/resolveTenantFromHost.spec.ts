/**
 * Unit tests for resolveTenantFromHeaders() and resolveTenantId().
 *
 * validateActiveTenant* functions are mocked so no DB connection is needed.
 * Each test verifies exactly one step of the 5-step priority chain that mirrors
 * _legacy/src/core/auth.py → get_principal_from_context() lines 228-296.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock the validateActiveTenant module BEFORE importing the module under test.
// ---------------------------------------------------------------------------
vi.mock("./validateActiveTenant.js", () => ({
  validateActiveTenant: vi.fn(),
  validateActiveTenantBySubdomain: vi.fn(),
  validateActiveTenantByVirtualHost: vi.fn(),
}));

import {
  validateActiveTenant,
  validateActiveTenantBySubdomain,
  validateActiveTenantByVirtualHost,
} from "./validateActiveTenant.js";
import { EXCLUDED_SUBDOMAINS, resolveTenantFromHeaders, resolveTenantId } from "./resolveTenantFromHost.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal ActiveTenant stub sufficient for the resolver's return type. */
function tenant(id: string) {
  return { tenantId: id, subdomain: id, isActive: true } as ReturnType<typeof validateActiveTenantBySubdomain> extends Promise<infer T> ? T : never;
}

function allNull() {
  vi.mocked(validateActiveTenantByVirtualHost).mockResolvedValue(null);
  vi.mocked(validateActiveTenantBySubdomain).mockResolvedValue(null);
  vi.mocked(validateActiveTenant).mockResolvedValue(null);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("resolveTenantFromHeaders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Step 1: virtual-host match on Host header ─────────────────────────────
  describe("step 1 – Host header virtual-host lookup", () => {
    it("returns tenant when Host matches a virtual host", async () => {
      vi.mocked(validateActiveTenantByVirtualHost).mockResolvedValue(tenant("vhost-tenant"));

      const result = await resolveTenantFromHeaders({ host: "adcp.acme.com" });

      expect(result?.tenantId).toBe("vhost-tenant");
      expect(validateActiveTenantByVirtualHost).toHaveBeenCalledWith("adcp.acme.com");
    });

    it("falls through when virtual-host lookup returns null", async () => {
      vi.mocked(validateActiveTenantByVirtualHost).mockResolvedValue(null);
      vi.mocked(validateActiveTenantBySubdomain).mockResolvedValue(tenant("subdomain-tenant"));

      const result = await resolveTenantFromHeaders({ host: "acme.example.com" });

      expect(result?.tenantId).toBe("subdomain-tenant");
    });
  });

  // ── Step 2: subdomain extraction from Host header ─────────────────────────
  describe("step 2 – Host header subdomain extraction", () => {
    it("extracts first subdomain component and looks it up", async () => {
      vi.mocked(validateActiveTenantByVirtualHost).mockResolvedValue(null);
      vi.mocked(validateActiveTenantBySubdomain).mockResolvedValue(tenant("acme-tenant"));

      const result = await resolveTenantFromHeaders({ host: "acme.sales-agent.example.com" });

      expect(result?.tenantId).toBe("acme-tenant");
      expect(validateActiveTenantBySubdomain).toHaveBeenCalledWith("acme");
    });

    it("skips excluded subdomains (www)", async () => {
      allNull();
      vi.mocked(validateActiveTenantByVirtualHost).mockResolvedValue(null);

      await resolveTenantFromHeaders({ host: "www.example.com" });

      // validateActiveTenantBySubdomain must NOT be called with "www"
      expect(validateActiveTenantBySubdomain).not.toHaveBeenCalledWith("www");
    });

    it("skips excluded subdomains (admin)", async () => {
      allNull();
      await resolveTenantFromHeaders({ host: "admin.example.com" });
      expect(validateActiveTenantBySubdomain).not.toHaveBeenCalledWith("admin");
    });

    it("does not attempt subdomain extraction for a bare hostname (no dot)", async () => {
      allNull();
      await resolveTenantFromHeaders({ host: "localhost" });
      // Only the localhost-fallback lookup with "default" is allowed
      expect(validateActiveTenantBySubdomain).not.toHaveBeenCalledWith("localhost");
    });
  });

  // ── Step 3: x-adcp-tenant header ─────────────────────────────────────────
  describe("step 3 – x-adcp-tenant header", () => {
    it("looks up tenant by subdomain from x-adcp-tenant header", async () => {
      vi.mocked(validateActiveTenantByVirtualHost).mockResolvedValue(null);
      vi.mocked(validateActiveTenantBySubdomain)
        .mockResolvedValueOnce(null)   // step 2: subdomain from host (host has no dot)
        .mockResolvedValueOnce(tenant("hint-tenant")); // step 3: subdomain hint

      const result = await resolveTenantFromHeaders({
        host: "localhost",
        "x-adcp-tenant": "hint-tenant",
      });

      // "default" fallback from step 5 must not have been reached because step 3 matched
      expect(result?.tenantId).toBe("hint-tenant");
      expect(validateActiveTenantBySubdomain).toHaveBeenCalledWith("hint-tenant");
    });

    it("falls back to tenant_id lookup when subdomain hint misses", async () => {
      vi.mocked(validateActiveTenantByVirtualHost).mockResolvedValue(null);
      vi.mocked(validateActiveTenantBySubdomain).mockResolvedValue(null);
      vi.mocked(validateActiveTenant).mockResolvedValue(tenant("direct-id-tenant"));

      const result = await resolveTenantFromHeaders({
        host: "",
        "x-adcp-tenant": "direct-id-tenant",
      });

      expect(result?.tenantId).toBe("direct-id-tenant");
      expect(validateActiveTenant).toHaveBeenCalledWith("direct-id-tenant");
    });
  });

  // ── Step 4: Apx-Incoming-Host header ─────────────────────────────────────
  describe("step 4 – Apx-Incoming-Host header", () => {
    it("resolves tenant from Apx-Incoming-Host virtual host", async () => {
      vi.mocked(validateActiveTenantByVirtualHost)
        .mockResolvedValueOnce(null)              // step 1: Host header
        .mockResolvedValueOnce(tenant("apx-tenant")); // step 4: Apx-Incoming-Host
      vi.mocked(validateActiveTenantBySubdomain).mockResolvedValue(null);
      vi.mocked(validateActiveTenant).mockResolvedValue(null);

      const result = await resolveTenantFromHeaders({
        host: "generic.host",
        "apx-incoming-host": "acme.custom-domain.com",
      });

      expect(result?.tenantId).toBe("apx-tenant");
      expect(validateActiveTenantByVirtualHost).toHaveBeenCalledWith("acme.custom-domain.com");
    });
  });

  // ── Step 5: localhost fallback ────────────────────────────────────────────
  describe("step 5 – localhost dev fallback", () => {
    it('resolves "default" tenant for localhost host', async () => {
      // "localhost" has no "." so step 2 is skipped entirely.
      // Step 5 is the FIRST call to validateActiveTenantBySubdomain.
      vi.mocked(validateActiveTenantByVirtualHost).mockResolvedValue(null);
      vi.mocked(validateActiveTenantBySubdomain).mockResolvedValue(tenant("default")); // step 5
      vi.mocked(validateActiveTenant).mockResolvedValue(null);

      const result = await resolveTenantFromHeaders({ host: "localhost" });

      expect(result?.tenantId).toBe("default");
      expect(validateActiveTenantBySubdomain).toHaveBeenCalledWith("default");
    });

    it('resolves "default" tenant for 127.0.0.1', async () => {
      vi.mocked(validateActiveTenantByVirtualHost).mockResolvedValue(null);
      vi.mocked(validateActiveTenantBySubdomain)
        .mockResolvedValueOnce(null)               // step 2: subdomain of "127"
        .mockResolvedValueOnce(tenant("default")); // step 5
      vi.mocked(validateActiveTenant).mockResolvedValue(null);

      const result = await resolveTenantFromHeaders({ host: "127.0.0.1" });

      expect(result?.tenantId).toBe("default");
    });

    it("returns null when no step resolves a tenant", async () => {
      allNull();
      const result = await resolveTenantFromHeaders({ host: "unknown.example.com" });
      expect(result).toBeNull();
    });
  });

  // ── Excluded subdomains constant ─────────────────────────────────────────
  describe("EXCLUDED_SUBDOMAINS", () => {
    it("contains the expected values", () => {
      expect(EXCLUDED_SUBDOMAINS.has("localhost")).toBe(true);
      expect(EXCLUDED_SUBDOMAINS.has("www")).toBe(true);
      expect(EXCLUDED_SUBDOMAINS.has("admin")).toBe(true);
      expect(EXCLUDED_SUBDOMAINS.has("adcp-sales-agent")).toBe(true);
      expect(EXCLUDED_SUBDOMAINS.has("acme")).toBe(false);
    });
  });
});

// ── resolveTenantId convenience wrapper ─────────────────────────────────────
describe("resolveTenantId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the tenantId string when a tenant is resolved", async () => {
    vi.mocked(validateActiveTenantByVirtualHost).mockResolvedValue(tenant("my-tenant"));
    const id = await resolveTenantId({ host: "my-tenant.example.com" });
    expect(id).toBe("my-tenant");
  });

  it("returns null when no tenant is resolved", async () => {
    allNull();
    const id = await resolveTenantId({ host: "" });
    expect(id).toBeNull();
  });
});
