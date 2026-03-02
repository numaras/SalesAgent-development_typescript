/**
 * Unit tests for pushNotificationService.
 *
 * Covers:
 *  - sendPushNotification webhook delivery (no URL → false, 2xx → true, non-2xx
 *    → false, throw → false, Bearer auth, HMAC-SHA256)
 *  - CRUD round-trip: setPushNotificationConfig (create+update), getPushNotificationConfig,
 *    listPushNotificationConfigs, deletePushNotificationConfig (soft-delete), not-found
 *    errors for get+delete.
 *    Parity: adcp_a2a_server.py L1072-1366.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/client.js", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

import { db } from "../db/client.js";
import {
  PushNotificationConfigNotFoundError,
  deletePushNotificationConfig,
  getPushNotificationConfig,
  listPushNotificationConfigs,
  sendPushNotification,
  setPushNotificationConfig,
} from "./pushNotificationService.js";

const mockFetch = vi.fn();
const originalFetch = globalThis.fetch;

describe("sendPushNotification", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns false when config has no url", async () => {
    const result = await sendPushNotification(
      { url: undefined },
      { key: "value" },
    );
    expect(result).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns false when config.url is empty string", async () => {
    const result = await sendPushNotification({ url: "   " }, {});
    expect(result).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns false and skips fetch for blocked private/local URL", async () => {
    const result = await sendPushNotification(
      { url: "http://127.0.0.1/internal-webhook" },
      { event: "test" },
    );
    expect(result).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns true when fetch returns 2xx", async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200 });

    const result = await sendPushNotification(
      { url: "https://example.com/webhook" },
      { event: "test" },
    );

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://example.com/webhook",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ event: "test" }),
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "User-Agent": "AdCP-Sales-Agent/1.0",
        }),
      }),
    );
  });

  it("returns false when fetch returns non-2xx", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    const result = await sendPushNotification(
      { url: "https://example.com/webhook" },
      {},
    );

    expect(result).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("returns false when fetch throws", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const result = await sendPushNotification(
      { url: "https://example.com/webhook" },
      {},
    );

    expect(result).toBe(false);
  });

  it("sets Authorization Bearer header when authentication.type is Bearer", async () => {
    mockFetch.mockResolvedValue({ ok: true });

    await sendPushNotification(
      {
        url: "https://example.com/webhook",
        authentication: { type: "Bearer", token: "secret-token" },
      },
      { data: 1 },
    );

    expect(mockFetch).toHaveBeenCalledWith(
      "https://example.com/webhook",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer secret-token",
        }),
      }),
    );
  });

  it("sets X-Adcp-Timestamp and X-Adcp-Signature when authentication is HMAC-SHA256", async () => {
    mockFetch.mockResolvedValue({ ok: true });

    await sendPushNotification(
      {
        url: "https://example.com/webhook",
        authentication: { type: "HMAC-SHA256", token: "hmac-secret" },
      },
      { payload: true },
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const call = mockFetch.mock.calls[0][1];
    const headers = call.headers as Record<string, string>;
    expect(headers["X-Adcp-Timestamp"]).toBeDefined();
    expect(headers["X-Adcp-Signature"]).toBeDefined();
    expect(typeof headers["X-Adcp-Timestamp"]).toBe("string");
    expect(typeof headers["X-Adcp-Signature"]).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// CRUD round-trip tests
// Parity: adcp_a2a_server.py L1072-1366
// ---------------------------------------------------------------------------

const ctx = { tenantId: "t-test", principalId: "pr-test" };

function makeRow(overrides: Partial<{
  id: string;
  url: string;
  authenticationType: string | null;
  authenticationToken: string | null;
  validationToken: string | null;
  createdAt: Date;
  isActive: boolean;
}> = {}) {
  return {
    id: "pnc_abc123",
    url: "https://example.com/hook",
    authenticationType: null,
    authenticationToken: null,
    validationToken: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    isActive: true,
    ...overrides,
  };
}

function mockSelectChain(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  };
}

function mockSelectChainNoLimit(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(rows),
  };
}

function mockInsertChain() {
  return {
    values: vi.fn().mockResolvedValue(undefined),
  };
}

function mockUpdateChain() {
  return {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  };
}

describe("setPushNotificationConfig", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("creates a new config when none exists and returns TaskPushNotificationConfig shape", async () => {
    vi.mocked(db).select = vi.fn().mockReturnValue(mockSelectChain([]));
    vi.mocked(db).insert = vi.fn().mockReturnValue(mockInsertChain());

    const result = await setPushNotificationConfig(ctx, {
      push_notification_config: {
        url: "https://example.com/hook",
        authentication: { schemes: ["Bearer"], credentials: "tok123" },
      },
    });

    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      task_id: "*",
      push_notification_config: expect.objectContaining({
        url: "https://example.com/hook",
        authentication: { schemes: ["Bearer"], credentials: "tok123" },
      }),
    });
    expect(typeof result.push_notification_config.id).toBe("string");
  });

  it("updates an existing config and returns TaskPushNotificationConfig shape", async () => {
    vi.mocked(db).select = vi
      .fn()
      .mockReturnValue(mockSelectChain([{ id: "pnc_existing" }]));
    vi.mocked(db).update = vi.fn().mockReturnValue(mockUpdateChain());

    const result = await setPushNotificationConfig(ctx, {
      task_id: "task-xyz",
      push_notification_config: {
        id: "pnc_existing",
        url: "https://new.example.com/hook",
      },
    });

    expect(db.update).toHaveBeenCalledTimes(1);
    expect(result.task_id).toBe("task-xyz");
    expect(result.push_notification_config.id).toBe("pnc_existing");
    expect(result.push_notification_config.url).toBe(
      "https://new.example.com/hook",
    );
  });
});

describe("getPushNotificationConfig", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns config when found", async () => {
    const row = makeRow({
      authenticationType: "Bearer",
      authenticationToken: "sec",
      validationToken: "vtok",
    });
    vi.mocked(db).select = vi.fn().mockReturnValue(mockSelectChain([row]));

    const result = await getPushNotificationConfig(ctx, { id: row.id });

    expect(result).toMatchObject({
      id: row.id,
      url: row.url,
      authentication: { type: "Bearer", token: "sec" },
      token: "vtok",
    });
  });

  it("throws PushNotificationConfigNotFoundError when not found", async () => {
    vi.mocked(db).select = vi.fn().mockReturnValue(mockSelectChain([]));

    await expect(
      getPushNotificationConfig(ctx, { id: "pnc_missing" }),
    ).rejects.toBeInstanceOf(PushNotificationConfigNotFoundError);
  });
});

describe("listPushNotificationConfigs", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns configs array and total_count", async () => {
    const rows = [makeRow({ id: "pnc_1" }), makeRow({ id: "pnc_2" })];
    vi.mocked(db).select = vi.fn().mockReturnValue(mockSelectChainNoLimit(rows));

    const result = await listPushNotificationConfigs(ctx);

    expect(result.total_count).toBe(2);
    expect(result.configs).toHaveLength(2);
    expect(result.configs[0]).toHaveProperty("id", "pnc_1");
    expect(result.configs[1]).toHaveProperty("id", "pnc_2");
  });

  it("returns empty list when no active configs exist", async () => {
    vi.mocked(db).select = vi.fn().mockReturnValue(mockSelectChainNoLimit([]));

    const result = await listPushNotificationConfigs(ctx);

    expect(result.total_count).toBe(0);
    expect(result.configs).toHaveLength(0);
  });
});

describe("deletePushNotificationConfig", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("soft-deletes config and returns {id, status, message}", async () => {
    vi.mocked(db).select = vi
      .fn()
      .mockReturnValue(mockSelectChain([{ id: "pnc_del" }]));
    vi.mocked(db).update = vi.fn().mockReturnValue(mockUpdateChain());

    const result = await deletePushNotificationConfig(ctx, { id: "pnc_del" });

    expect(db.update).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      id: "pnc_del",
      status: "deleted",
      message: "Push notification configuration deleted successfully",
    });
  });

  it("throws PushNotificationConfigNotFoundError when config not found", async () => {
    vi.mocked(db).select = vi.fn().mockReturnValue(mockSelectChain([]));

    await expect(
      deletePushNotificationConfig(ctx, { id: "pnc_missing" }),
    ).rejects.toBeInstanceOf(PushNotificationConfigNotFoundError);
  });
});
