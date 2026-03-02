/**
 * Unit tests for propertiesService.
 *
 * DB is mocked via vi.mock so no real PostgreSQL connection is needed.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/client.js", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

import { db } from "../db/client.js";
import { ListAuthorizedPropertiesResponseSchema } from "../schemas/authorizedProperties.js";
import { listAuthorizedProperties } from "./propertiesService.js";

/** Fluent mock for db.select().from().where().limit() returning rows. */
function mockSelectChain<T>(rows: T[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
    // allow resolving directly when .limit() is not called
    then: undefined as unknown,
  };
}

/** Fluent mock that resolves when .where() is the final call (no .limit()). */
function mockSelectChainNoLimit<T>(rows: T[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(rows),
  };
}

/** Fluent mock for db.insert().values() */
function mockInsertChain() {
  return {
    values: vi.fn().mockResolvedValue(undefined),
  };
}

describe("listAuthorizedProperties", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Default: audit insert is a no-op
    vi.mocked(db).insert = vi.fn().mockReturnValue(mockInsertChain());
  });

  it("returns tenant-scoped publisher_domains", async () => {
    vi.mocked(db).select = vi.fn()
      // 1st call: publisherPartners query
      .mockReturnValueOnce(mockSelectChainNoLimit([
        { publisherDomain: "example.com" },
        { publisherDomain: "publisher.net" },
      ]) as ReturnType<typeof mockSelectChainNoLimit>)
      // 2nd call: tenants query (no advertising policy)
      .mockReturnValueOnce(mockSelectChain([{ advertisingPolicy: null }]) as ReturnType<typeof mockSelectChain>);

    const result = await listAuthorizedProperties(
      { tenantId: "tenant-a" },
      undefined,
    );

    expect(ListAuthorizedPropertiesResponseSchema.safeParse(result).success).toBe(true);
    expect(result.publisher_domains).toEqual(["example.com", "publisher.net"]);
  });

  it("returns empty list when tenant has no publisher partners", async () => {
    vi.mocked(db).select = vi.fn()
      .mockReturnValueOnce(mockSelectChainNoLimit([]) as ReturnType<typeof mockSelectChainNoLimit>);

    const result = await listAuthorizedProperties(
      { tenantId: "tenant-empty" },
      undefined,
    );

    expect(ListAuthorizedPropertiesResponseSchema.safeParse(result).success).toBe(true);
    expect(result.publisher_domains).toEqual([]);
    expect(result.portfolio_description).toBe(
      "No publisher partnerships are currently configured. Publishers can be added via the Admin UI.",
    );
  });

  it("echoes request context when provided", async () => {
    vi.mocked(db).select = vi.fn()
      .mockReturnValueOnce(mockSelectChainNoLimit([{ publisherDomain: "site.com" }]) as ReturnType<typeof mockSelectChainNoLimit>)
      .mockReturnValueOnce(mockSelectChain([{ advertisingPolicy: null }]) as ReturnType<typeof mockSelectChain>);

    const result = await listAuthorizedProperties(
      { tenantId: "t1" },
      { context: { request_id: "req-123" } },
    );

    expect(result.context).toEqual({ request_id: "req-123" });
    expect(result.publisher_domains).toEqual(["site.com"]);
  });

  it("sorts publisher_domains alphabetically", async () => {
    vi.mocked(db).select = vi.fn()
      .mockReturnValueOnce(mockSelectChainNoLimit([
        { publisherDomain: "z.org" },
        { publisherDomain: "a.org" },
      ]) as ReturnType<typeof mockSelectChainNoLimit>)
      .mockReturnValueOnce(mockSelectChain([{ advertisingPolicy: null }]) as ReturnType<typeof mockSelectChain>);

    const result = await listAuthorizedProperties(
      { tenantId: "tenant-a" },
      undefined,
    );

    expect(result.publisher_domains).toEqual(["a.org", "z.org"]);
  });

  it("includes advertising_policies text when policy is enabled", async () => {
    const policy = {
      enabled: true,
      default_prohibited_categories: ["Alcohol", "Tobacco"],
      default_prohibited_tactics: ["Retargeting"],
      prohibited_categories: ["Gambling"],
      prohibited_tactics: [],
      prohibited_advertisers: ["bad-actor.com"],
    };

    vi.mocked(db).select = vi.fn()
      .mockReturnValueOnce(mockSelectChainNoLimit([{ publisherDomain: "pub.com" }]) as ReturnType<typeof mockSelectChainNoLimit>)
      .mockReturnValueOnce(mockSelectChain([{ advertisingPolicy: policy }]) as ReturnType<typeof mockSelectChain>);

    const result = await listAuthorizedProperties({ tenantId: "t1" }, undefined);

    expect(result.advertising_policies).toBeDefined();
    expect(result.advertising_policies).toContain("Alcohol");
    expect(result.advertising_policies).toContain("Retargeting");
    expect(result.advertising_policies).toContain("bad-actor.com");
    expect(result.advertising_policies).toContain("Policy Enforcement");
  });

  it("omits advertising_policies when policy is disabled", async () => {
    vi.mocked(db).select = vi.fn()
      .mockReturnValueOnce(mockSelectChainNoLimit([{ publisherDomain: "pub.com" }]) as ReturnType<typeof mockSelectChainNoLimit>)
      .mockReturnValueOnce(mockSelectChain([{ advertisingPolicy: { enabled: false } }]) as ReturnType<typeof mockSelectChain>);

    const result = await listAuthorizedProperties({ tenantId: "t1" }, undefined);

    expect(result.advertising_policies).toBeUndefined();
  });

  it("wraps DB errors as PROPERTIES_ERROR", async () => {
    vi.mocked(db).select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockRejectedValue(new Error("DB connection refused")),
    });

    await expect(
      listAuthorizedProperties({ tenantId: "t1" }, undefined),
    ).rejects.toThrow("PROPERTIES_ERROR");
  });
});
