import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyPluginAsync } from "fastify";

import { buildApp } from "../../../app.js";
import creativeAgentsRoute from "./creativeAgents.js";

const mockRequireTenantAccess = vi.fn();
vi.mock("../../services/authGuard.js", () => ({
  requireTenantAccess: (...args: unknown[]) => mockRequireTenantAccess(...args),
}));

const mockLimit = vi.fn<() => Promise<unknown[]>>();
const mockOrderBy = vi.fn<() => Promise<unknown[]>>();
const mockWhere = vi.fn(() => ({ limit: mockLimit, orderBy: mockOrderBy }));
const mockFrom = vi.fn(() => ({ where: mockWhere, orderBy: mockOrderBy }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));

const mockInsertReturning = vi.fn<() => Promise<unknown[]>>();
const mockInsertValues = vi.fn(() => ({ returning: mockInsertReturning }));
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

vi.mock("../../../db/client.js", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}));

async function createAdminApp(routePlugin: FastifyPluginAsync) {
  const app = await buildApp({ logger: false, registerDefaultRoutes: false });
  await app.register(routePlugin);
  return app;
}

describe("Creative agents route validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireTenantAccess.mockResolvedValue(true);
  });

  it("POST /tenant/:id/creative-agents/add clamps timeout into supported range", async () => {
    mockLimit.mockResolvedValueOnce([{ tenantId: "tenant-1", name: "Tenant One" }]);
    mockInsertReturning.mockResolvedValueOnce([{ id: 1, name: "Agent A" }]);

    const app = await createAdminApp(creativeAgentsRoute);
    const res = await app.inject({
      method: "POST",
      url: "/tenant/tenant-1/creative-agents/add",
      payload: {
        agent_url: "https://example.com",
        name: "Agent A",
        enabled: true,
        priority: 10,
        timeout: 999,
      },
    });
    await app.close();

    expect(res.statusCode).toBe(200);
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ timeout: 300 }),
    );
  });

  it("GET /tenant/:id/creative-agents/:agentId/edit includes timeout in payload", async () => {
    mockLimit
      .mockResolvedValueOnce([{ tenantId: "tenant-1", name: "Tenant One" }])
      .mockResolvedValueOnce([
        {
          id: 2,
          tenantId: "tenant-1",
          agentUrl: "https://example.com",
          name: "Agent B",
          enabled: true,
          priority: 5,
          timeout: 45,
          authType: null,
          authHeader: null,
          authCredentials: null,
        },
      ]);

    const app = await createAdminApp(creativeAgentsRoute);
    const res = await app.inject({
      method: "GET",
      url: "/tenant/tenant-1/creative-agents/2/edit",
    });
    await app.close();

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      agent: {
        id: 2,
        timeout: 45,
      },
    });
  });
});
