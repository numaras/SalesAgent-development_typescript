/**
 * Unit tests for lookupPrincipalByToken() and lookupPrincipalGlobal().
 *
 * DB is mocked via vi.mock so no real PostgreSQL connection is needed.
 * Tests verify the exact branching logic ported from
 *   _legacy/src/core/auth.py → get_principal_from_token()
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock the DB client *before* importing the module under test
// ---------------------------------------------------------------------------

vi.mock("../db/client.js", () => ({
  db: {
    select: vi.fn(),
  },
}));

import { db } from "../db/client.js";
import {
  lookupPrincipalByToken,
  lookupPrincipalGlobal,
} from "./lookupPrincipal.js";

// ---------------------------------------------------------------------------
// Helpers for fluent Drizzle-style chain mocking
// ---------------------------------------------------------------------------

/** Returns a chainable mock that resolves with `rows` at the end. */
function mockChain(rows: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: (resolve: (rows: unknown[]) => unknown) => Promise.resolve(resolve(rows)),
  };
  return chain;
}

// ---------------------------------------------------------------------------
// lookupPrincipalByToken
// ---------------------------------------------------------------------------

describe("lookupPrincipalByToken", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns principalId when token is found in the given tenant", async () => {
    // First select: initial existence check
    // Second select: tenantId guard
    const selectMock = vi.fn()
      .mockReturnValueOnce(mockChain([{ principalId: "p-001" }]))
      .mockReturnValueOnce(mockChain([{ principalId: "p-001", tenantId: "tenant-a" }]));

    vi.mocked(db).select = selectMock;

    const result = await lookupPrincipalByToken("tok-abc", "tenant-a");
    expect(result).toBe("p-001");
  });

  it("returns null when no principal matches the token", async () => {
    vi.mocked(db).select = vi.fn()
      .mockReturnValueOnce(mockChain([])) // first query: no row found
      .mockReturnValueOnce(mockChain([]));

    const result = await lookupPrincipalByToken("bad-token", "tenant-a");
    expect(result).toBeNull();
  });

  it("returns null when token matches but belongs to a different tenant", async () => {
    vi.mocked(db).select = vi.fn()
      .mockReturnValueOnce(mockChain([{ principalId: "p-001" }]))          // first exists check
      .mockReturnValueOnce(mockChain([{ principalId: "p-001", tenantId: "tenant-b" }])); // guard: wrong tenant

    const result = await lookupPrincipalByToken("cross-tenant-tok", "tenant-a");
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// lookupPrincipalGlobal
// ---------------------------------------------------------------------------

describe("lookupPrincipalGlobal", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns { principalId, tenantId } when token is found and tenant is active", async () => {
    vi.mocked(db).select = vi.fn()
      .mockReturnValueOnce(mockChain([{ principalId: "p-999", tenantId: "tenant-x" }])) // principals lookup
      .mockReturnValueOnce(mockChain([{ tenantId: "tenant-x", isActive: true }]));        // tenant check

    const result = await lookupPrincipalGlobal("global-tok");
    expect(result).toEqual({ principalId: "p-999", tenantId: "tenant-x" });
  });

  it("returns null when no principal matches the token globally", async () => {
    vi.mocked(db).select = vi.fn()
      .mockReturnValueOnce(mockChain([])); // no principal found

    const result = await lookupPrincipalGlobal("unknown-tok");
    expect(result).toBeNull();
  });

  it("returns null when tenant is inactive (security guard)", async () => {
    vi.mocked(db).select = vi.fn()
      .mockReturnValueOnce(mockChain([{ principalId: "p-001", tenantId: "inactive-t" }]))
      .mockReturnValueOnce(mockChain([{ tenantId: "inactive-t", isActive: false }])); // inactive!

    const result = await lookupPrincipalGlobal("tok-for-inactive-tenant");
    expect(result).toBeNull();
  });

  it("returns null when tenant row not found at all", async () => {
    vi.mocked(db).select = vi.fn()
      .mockReturnValueOnce(mockChain([{ principalId: "p-orphan", tenantId: "ghost-tenant" }]))
      .mockReturnValueOnce(mockChain([])); // tenant deleted

    const result = await lookupPrincipalGlobal("orphan-tok");
    expect(result).toBeNull();
  });
});
