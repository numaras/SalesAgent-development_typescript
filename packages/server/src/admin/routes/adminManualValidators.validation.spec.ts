import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyPluginAsync } from "fastify";

import { buildApp } from "../../app.js";
import addProductRoute from "./products/addProduct.js";
import editProductRoute from "./products/editProduct.js";
import principalWebhooksRoute from "./principals/principalWebhooks.js";
import domainSettingsRoute from "./settings/domains.js";
import generalSettingsRoute from "./settings/general.js";
import tenantFaviconRoute from "./tenants/favicon.js";
import usersDomainsRoute from "./users/domains.js";

const mockRequireTenantAccess = vi.fn();
vi.mock("../services/authGuard.js", () => ({
  requireTenantAccess: (...args: unknown[]) => mockRequireTenantAccess(...args),
}));

let sessionState: Record<string, unknown> = {};
vi.mock("../services/sessionService.js", () => ({
  getAdminSession: () => sessionState,
}));

const selectRowsQueue: unknown[][] = [];

function nextSelectRows() {
  return selectRowsQueue.shift() ?? [];
}

function createSelectChain() {
  const chain = {
    where: () => createSelectChain(),
    orderBy: () => createSelectChain(),
    limit: () => Promise.resolve(nextSelectRows()),
    then: (resolve: (value: unknown[]) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(nextSelectRows()).then(resolve, reject),
  };
  return chain;
}

const mockSelect = vi.fn(() => ({ from: () => createSelectChain() }));
const mockUpdateWhere = vi.fn(() => Promise.resolve());
const mockUpdateSet = vi.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }));

const mockInsertValues = vi.fn(() => Promise.resolve());
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

const mockDeleteWhere = vi.fn(() => Promise.resolve());
const mockDelete = vi.fn(() => ({ where: mockDeleteWhere }));

vi.mock("../../db/client.js", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

async function createRouteApp(routePlugin: FastifyPluginAsync) {
  const app = await buildApp({ logger: false, registerDefaultRoutes: false });
  await app.register(routePlugin);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  selectRowsQueue.length = 0;
  sessionState = { user: "admin@example.com", role: "super_admin", tenant_id: "tenant-1" };
  mockRequireTenantAccess.mockResolvedValue(true);
});

describe("Admin manual validators", () => {
  it("users domains add returns 400 for invalid format", async () => {
    const app = await createRouteApp(usersDomainsRoute);
    const res = await app.inject({
      method: "POST",
      url: "/tenant/tenant-1/users/domains",
      payload: { domain: "invalid-domain" },
    });
    await app.close();
    expect(res.statusCode).toBe(400);
  });

  it("users domains add returns 400 when domain already exists", async () => {
    selectRowsQueue.push([{ tenantId: "tenant-1", authorizedDomains: ["example.com"] }]);
    const app = await createRouteApp(usersDomainsRoute);
    const res = await app.inject({
      method: "POST",
      url: "/tenant/tenant-1/users/domains",
      payload: { domain: "example.com" },
    });
    await app.close();
    expect(res.statusCode).toBe(400);
  });

  it("settings domains add returns 400 for invalid domain", async () => {
    const app = await createRouteApp(domainSettingsRoute);
    const res = await app.inject({
      method: "POST",
      url: "/tenant/tenant-1/settings/domains/add",
      payload: { domain: "bad" },
    });
    await app.close();
    expect(res.statusCode).toBe(400);
  });

  it("settings domains remove returns 400 when domain is missing", async () => {
    const app = await createRouteApp(domainSettingsRoute);
    const res = await app.inject({
      method: "POST",
      url: "/tenant/tenant-1/settings/domains/remove",
      payload: {},
    });
    await app.close();
    expect(res.statusCode).toBe(400);
  });

  it("general settings update returns 400 when tenant name is missing", async () => {
    const app = await createRouteApp(generalSettingsRoute);
    const res = await app.inject({
      method: "POST",
      url: "/tenant/tenant-1/settings/general",
      payload: {},
    });
    await app.close();
    expect(res.statusCode).toBe(400);
  });

  it("general settings update returns 400 for invalid virtual host", async () => {
    selectRowsQueue.push([{ tenantId: "tenant-1" }]);
    const app = await createRouteApp(generalSettingsRoute);
    const res = await app.inject({
      method: "POST",
      url: "/tenant/tenant-1/settings/general",
      payload: { name: "Tenant", virtual_host: "bad..host" },
    });
    await app.close();
    expect(res.statusCode).toBe(400);
  });

  it("general settings update returns 409 for virtual host conflict", async () => {
    selectRowsQueue.push([{ tenantId: "tenant-1" }], [{ tenantId: "tenant-2" }]);
    const app = await createRouteApp(generalSettingsRoute);
    const res = await app.inject({
      method: "POST",
      url: "/tenant/tenant-1/settings/general",
      payload: { name: "Tenant", virtual_host: "used.example.com" },
    });
    await app.close();
    expect(res.statusCode).toBe(409);
  });

  it("favicon URL update returns 400 for unsafe scheme", async () => {
    const app = await createRouteApp(tenantFaviconRoute);
    const res = await app.inject({
      method: "POST",
      url: "/tenant/tenant-1/update_favicon_url",
      payload: { favicon_url: "javascript:alert(1)" },
    });
    await app.close();
    expect(res.statusCode).toBe(400);
  });

  it("favicon upload returns 400 for invalid tenant id", async () => {
    const app = await createRouteApp(tenantFaviconRoute);
    const res = await app.inject({
      method: "POST",
      url: "/tenant/tenant$1/upload_favicon",
      payload: {},
    });
    await app.close();
    expect(res.statusCode).toBe(400);
  });

  it("add product returns 400 when name is missing", async () => {
    selectRowsQueue.push([{ tenantId: "tenant-1", adServer: "mock" }]);
    const app = await createRouteApp(addProductRoute);
    const res = await app.inject({
      method: "POST",
      url: "/tenant/tenant-1/products/add",
      payload: {},
    });
    await app.close();
    expect(res.statusCode).toBe(400);
  });

  it("add product returns 400 when pricing options are empty", async () => {
    selectRowsQueue.push([{ tenantId: "tenant-1", adServer: "mock" }]);
    const app = await createRouteApp(addProductRoute);
    const res = await app.inject({
      method: "POST",
      url: "/tenant/tenant-1/products/add",
      payload: { name: "Product A", pricing_options: [] },
    });
    await app.close();
    expect(res.statusCode).toBe(400);
  });

  it("add product returns 400 when default-agent format id is invalid", async () => {
    selectRowsQueue.push([{ tenantId: "tenant-1", adServer: "mock" }]);
    const app = await createRouteApp(addProductRoute);
    const res = await app.inject({
      method: "POST",
      url: "/tenant/tenant-1/products/add",
      payload: {
        name: "Product A",
        formats: [
          {
            agent_url: "https://creative.adcontextprotocol.org",
            id: "display_999x999",
          },
        ],
        pricing_options: [{ is_fixed: true, fixed_price: "10.00", currency_code: "USD" }],
      },
    });
    await app.close();
    expect(res.statusCode).toBe(400);
  });

  it("edit product returns 400 for invalid inventory profile id", async () => {
    selectRowsQueue.push([{ productId: "prod-1", inventoryProfileId: null, maxSignals: 5 }]);
    const app = await createRouteApp(editProductRoute);
    const res = await app.inject({
      method: "POST",
      url: "/tenant/tenant-1/products/prod-1/edit",
      payload: {
        name: "Product A",
        inventory_profile_id: "not-a-number",
        pricing_options: [{ is_fixed: true }],
      },
    });
    await app.close();
    expect(res.statusCode).toBe(400);
  });

  it("edit product returns 400 when default-agent format id is invalid", async () => {
    selectRowsQueue.push([{ productId: "prod-1", inventoryProfileId: null, maxSignals: 5 }]);
    const app = await createRouteApp(editProductRoute);
    const res = await app.inject({
      method: "POST",
      url: "/tenant/tenant-1/products/prod-1/edit",
      payload: {
        name: "Product A",
        formats: [
          {
            agent_url: "https://creative.adcontextprotocol.org/",
            id: "display_999x999",
          },
        ],
        pricing_options: [{ is_fixed: true }],
      },
    });
    await app.close();
    expect(res.statusCode).toBe(400);
  });

  it("edit product returns 400 when profile belongs to another tenant", async () => {
    selectRowsQueue.push(
      [{ productId: "prod-1", inventoryProfileId: null, maxSignals: 5 }],
      [{ id: 77, tenantId: "tenant-2" }],
    );
    const app = await createRouteApp(editProductRoute);
    const res = await app.inject({
      method: "POST",
      url: "/tenant/tenant-1/products/prod-1/edit",
      payload: {
        name: "Product A",
        inventory_profile_id: "77",
        pricing_options: [{ is_fixed: true }],
      },
    });
    await app.close();
    expect(res.statusCode).toBe(400);
  });

  it("principal webhook register returns 400 when url is missing", async () => {
    const app = await createRouteApp(principalWebhooksRoute);
    const res = await app.inject({
      method: "POST",
      url: "/tenant/tenant-1/principals/p-1/webhooks/register",
      payload: {},
    });
    await app.close();
    expect(res.statusCode).toBe(400);
  });

  it("principal webhook register returns 400 for private webhook URL", async () => {
    const app = await createRouteApp(principalWebhooksRoute);
    const res = await app.inject({
      method: "POST",
      url: "/tenant/tenant-1/principals/p-1/webhooks/register",
      payload: { url: "http://127.0.0.1/callback" },
    });
    await app.close();
    expect(res.statusCode).toBe(400);
  });

  it("principal webhook register returns 400 for missing HMAC secret", async () => {
    const app = await createRouteApp(principalWebhooksRoute);
    const res = await app.inject({
      method: "POST",
      url: "/tenant/tenant-1/principals/p-1/webhooks/register",
      payload: { url: "https://example.com/hook", auth_type: "hmac_sha256" },
    });
    await app.close();
    expect(res.statusCode).toBe(400);
  });

  it("has happy path for domain add, product add and webhook register", async () => {
    const domainsApp = await createRouteApp(domainSettingsRoute);
    selectRowsQueue.push([{ tenantId: "tenant-1", authorizedDomains: [] }]);
    const domainRes = await domainsApp.inject({
      method: "POST",
      url: "/tenant/tenant-1/settings/domains/add",
      payload: { domain: "Example.COM" },
    });
    await domainsApp.close();
    expect(domainRes.statusCode).toBe(200);

    const addProductApp = await createRouteApp(addProductRoute);
    selectRowsQueue.push([{ tenantId: "tenant-1", adServer: "mock" }]);
    const addProductRes = await addProductApp.inject({
      method: "POST",
      url: "/tenant/tenant-1/products/add",
      payload: {
        name: "Product A",
        formats: [{ id: "display_300x250", agent_url: "https://creative.example" }],
        pricing_options: [{ is_fixed: true, pricing_model: "CPM", fixed_price: "2.0", currency_code: "USD" }],
      },
    });
    await addProductApp.close();
    expect(addProductRes.statusCode).toBe(201);

    const webhooksApp = await createRouteApp(principalWebhooksRoute);
    selectRowsQueue.push([{ principalId: "p-1" }], []);
    const webhookRes = await webhooksApp.inject({
      method: "POST",
      url: "/tenant/tenant-1/principals/p-1/webhooks/register",
      payload: { url: "https://hooks.example.com/callback", auth_type: "none" },
    });
    await webhooksApp.close();
    expect(webhookRes.statusCode).toBe(200);
  });
});
