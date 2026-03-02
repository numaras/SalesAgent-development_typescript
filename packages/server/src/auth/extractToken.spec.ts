/**
 * Unit tests for extractToken().
 *
 * Pure function — no DB or async I/O. Tests cover every branch in
 * _legacy/src/core/auth.py lines 304-322.
 */
import { describe, expect, it } from "vitest";

import { extractToken } from "./extractToken.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Headers = Record<string, string | string[] | undefined>;

function h(headers: Headers) {
  return extractToken(headers);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("extractToken", () => {
  describe("x-adcp-auth header (preferred)", () => {
    it("returns token from x-adcp-auth header", () => {
      const result = h({ "x-adcp-auth": "tok-abc" });
      expect(result).toEqual({ token: "tok-abc", source: "x-adcp-auth" });
    });

    it("returns x-adcp-auth even when Authorization header is also present", () => {
      const result = h({
        "x-adcp-auth": "adcp-token",
        authorization: "Bearer bearer-token",
      });
      expect(result).toEqual({ token: "adcp-token", source: "x-adcp-auth" });
    });

    it("finds x-adcp-auth regardless of header name case (raw Node.js headers)", () => {
      // Fastify lowercases, but raw Node.js may not
      const result = h({ "X-Adcp-Auth": "mixed-case-tok" });
      expect(result).toEqual({ token: "mixed-case-tok", source: "x-adcp-auth" });
    });

    it("handles array header value — uses first element", () => {
      const result = h({ "x-adcp-auth": ["first-tok", "second-tok"] });
      expect(result).toEqual({ token: "first-tok", source: "x-adcp-auth" });
    });
  });

  describe("Authorization: Bearer header (fallback)", () => {
    it("returns token from Authorization: Bearer header", () => {
      const result = h({ authorization: "Bearer my-bearer-token" });
      expect(result).toEqual({ token: "my-bearer-token", source: "authorization-bearer" });
    });

    it("strips leading/trailing whitespace from Bearer token", () => {
      const result = h({ authorization: "Bearer   spaced-token  " });
      expect(result).toEqual({ token: "spaced-token", source: "authorization-bearer" });
    });

    it("matches Bearer prefix case-insensitively (legacy compatibility)", () => {
      const result = h({ authorization: "bearer lower-case-prefix" });
      expect(result).toEqual({ token: "lower-case-prefix", source: "authorization-bearer" });
    });

    it("matches BEARER in all-caps", () => {
      const result = h({ authorization: "BEARER all-caps" });
      expect(result).toEqual({ token: "all-caps", source: "authorization-bearer" });
    });

    it("finds Authorization header regardless of header name case", () => {
      const result = h({ Authorization: "Bearer capital-auth-header" });
      expect(result).toEqual({ token: "capital-auth-header", source: "authorization-bearer" });
    });

    it("returns null for Authorization: Bearer with empty token", () => {
      // "Bearer " with only whitespace — no token
      const result = h({ authorization: "Bearer   " });
      expect(result).toBeNull();
    });

    it("returns null for Authorization: Basic (non-Bearer scheme)", () => {
      const result = h({ authorization: "Basic dXNlcjpwYXNz" });
      expect(result).toBeNull();
    });
  });

  describe("no token present", () => {
    it("returns null for empty headers", () => {
      expect(h({})).toBeNull();
    });

    it("returns null when neither auth header is present", () => {
      expect(h({ "content-type": "application/json" })).toBeNull();
    });

    it("returns null when x-adcp-auth is undefined", () => {
      expect(h({ "x-adcp-auth": undefined })).toBeNull();
    });
  });
});
