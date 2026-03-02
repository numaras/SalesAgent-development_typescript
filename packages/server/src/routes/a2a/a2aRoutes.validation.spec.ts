import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyPluginAsync } from "fastify";

import { buildApp } from "../../app.js";
import agentCardRoute from "./agentCard.js";
import jsonRpcRoute from "./jsonRpc.js";

const mockExtractAuthToken = vi.fn();
const mockBuildMissingBodyJsonRpcResponse = vi.fn();
const mockHandleJsonRpc = vi.fn();
vi.mock("../../services/a2aJsonRpcRouteService.js", () => ({
  extractAuthToken: (...args: unknown[]) => mockExtractAuthToken(...args),
  buildMissingBodyJsonRpcResponse: (...args: unknown[]) =>
    mockBuildMissingBodyJsonRpcResponse(...args),
  handleJsonRpc: (...args: unknown[]) => mockHandleJsonRpc(...args),
}));

const mockBuildBaseUrl = vi.fn();
const mockBuildAgentCard = vi.fn();
vi.mock("../../services/agentCardRouteService.js", () => ({
  buildBaseUrl: (...args: unknown[]) => mockBuildBaseUrl(...args),
  buildAgentCard: (...args: unknown[]) => mockBuildAgentCard(...args),
}));

async function createIsolatedApp(routePlugin: FastifyPluginAsync) {
  const app = await buildApp({ logger: false, registerDefaultRoutes: false });
  await app.register(routePlugin);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();

  mockExtractAuthToken.mockReturnValue("token-1");
  mockBuildMissingBodyJsonRpcResponse.mockReturnValue({
    jsonrpc: "2.0",
    error: { code: -32600, message: "Missing request body" },
    id: null,
  });
  mockHandleJsonRpc.mockResolvedValue({
    jsonrpc: "2.0",
    result: { ok: true },
    id: 1,
  });

  mockBuildBaseUrl.mockReturnValue("https://tenant.example.com");
  mockBuildAgentCard.mockReturnValue({
    name: "Sales Agent",
    description: "A2A card",
    version: "1.0.0",
  });
});

describe("A2A route validation coverage", () => {
  it("POST /a2a returns 400 response body for missing payload", async () => {
    const app = await createIsolatedApp(jsonRpcRoute);
    const res = await app.inject({ method: "POST", url: "/a2a" });
    await app.close();

    expect(res.statusCode).toBe(400);
    expect(mockBuildMissingBodyJsonRpcResponse).toHaveBeenCalledOnce();
    expect(mockHandleJsonRpc).not.toHaveBeenCalled();
  });

  it("POST /a2a returns 200 for valid JSON-RPC body", async () => {
    const app = await createIsolatedApp(jsonRpcRoute);
    const payload = { jsonrpc: "2.0", method: "get_products", params: {}, id: 1 };
    const res = await app.inject({ method: "POST", url: "/a2a", payload });
    await app.close();

    expect(res.statusCode).toBe(200);
    expect(mockExtractAuthToken).toHaveBeenCalledOnce();
    expect(mockHandleJsonRpc).toHaveBeenCalledWith(payload, "token-1", expect.any(Object));
  });

  it("POST /a2a/ returns 400 response body for missing payload", async () => {
    const app = await createIsolatedApp(jsonRpcRoute);
    const res = await app.inject({ method: "POST", url: "/a2a/" });
    await app.close();

    expect(res.statusCode).toBe(400);
    expect(mockBuildMissingBodyJsonRpcResponse).toHaveBeenCalledOnce();
  });

  it("POST /a2a/ returns 200 for valid JSON-RPC body", async () => {
    const app = await createIsolatedApp(jsonRpcRoute);
    const payload = { jsonrpc: "2.0", method: "get_adcp_capabilities", id: "req-1" };
    const res = await app.inject({ method: "POST", url: "/a2a/", payload });
    await app.close();

    expect(res.statusCode).toBe(200);
    expect(mockHandleJsonRpc).toHaveBeenCalledWith(payload, "token-1", expect.any(Object));
  });

  it("GET /.well-known/agent-card.json returns 200 and card", async () => {
    const app = await createIsolatedApp(agentCardRoute);
    const res = await app.inject({ method: "GET", url: "/.well-known/agent-card.json" });
    await app.close();

    expect(res.statusCode).toBe(200);
    expect(mockBuildBaseUrl).toHaveBeenCalledOnce();
    expect(mockBuildAgentCard).toHaveBeenCalledWith("https://tenant.example.com");
  });

  it("GET /.well-known/agent.json returns 200 and card", async () => {
    const app = await createIsolatedApp(agentCardRoute);
    const res = await app.inject({ method: "GET", url: "/.well-known/agent.json" });
    await app.close();

    expect(res.statusCode).toBe(200);
  });

  it("GET /agent.json returns 200 and card", async () => {
    const app = await createIsolatedApp(agentCardRoute);
    const res = await app.inject({ method: "GET", url: "/agent.json" });
    await app.close();

    expect(res.statusCode).toBe(200);
  });
});