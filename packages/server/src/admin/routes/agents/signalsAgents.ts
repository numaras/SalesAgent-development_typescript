import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { signalsAgents } from "../../../db/schema/agents.js";
import { tenants } from "../../../db/schema/tenants.js";
import { validateOutboundUrl } from "../../../security/outboundUrl.js";
import { requireTenantAccess } from "../../services/authGuard.js";

/**
 * Minimal MCP Streamable HTTP client for testing agent connectivity.
 * Mirrors Python's SignalsAgentRegistry.test_connection() — calls the agent's
 * MCP endpoint via JSON-RPC and returns the raw tool-result object or throws.
 *
 * Protocol: MCP Streamable HTTP (FastMCP 2.x)
 *   1. POST {url}  initialize → get Mcp-Session-Id header
 *   2. POST {url}  tools/call → get tool result (JSON or SSE)
 */
async function callAgentMcpTool(
  agentUrl: string,
  toolName: string,
  args: Record<string, unknown>,
  authHeaderName: string | null,
  authCredentials: string | null,
  timeoutMs = 30_000,
): Promise<Record<string, unknown>> {
  const urlCheck = validateOutboundUrl(agentUrl, { allowHttp: true });
  if (!urlCheck.valid) {
    throw new Error(`Invalid agent URL: ${urlCheck.error}`);
  }

  const base = agentUrl.endsWith("/") ? agentUrl.slice(0, -1) : agentUrl;
  const mcpUrl = base.endsWith("/mcp") ? base + "/" : base + "/mcp/";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
  };
  if (authCredentials) {
    headers[authHeaderName || "x-adcp-auth"] = authCredentials;
  }

  // Step 1: Initialize MCP session
  const initRes = await fetch(mcpUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "salesagent-test", version: "1.0.0" },
      },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!initRes.ok) {
    throw new Error(`HTTP ${initRes.status} during MCP initialize`);
  }

  const sessionId = initRes.headers.get("Mcp-Session-Id");
  if (sessionId) {
    headers["Mcp-Session-Id"] = sessionId;
  }

  // Step 2: Call the tool
  const toolRes = await fetch(mcpUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: toolName, arguments: args },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!toolRes.ok) {
    throw new Error(`HTTP ${toolRes.status} during MCP tool call`);
  }

  const rpc = (await toolRes.json()) as Record<string, unknown>;
  if (rpc["error"]) {
    const err = rpc["error"] as Record<string, unknown>;
    throw new Error(String(err["message"] ?? "MCP error"));
  }

  const result = rpc["result"] as Record<string, unknown> | undefined;
  const content = result?.["content"];
  if (Array.isArray(content) && content.length > 0) {
    const first = content[0] as Record<string, unknown>;
    if (first["type"] === "text" && typeof first["text"] === "string") {
      return JSON.parse(first["text"]) as Record<string, unknown>;
    }
  }
  return result ?? {};
}

const signalsAgentsRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/tenant/:id/signals-agents/", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const [tenant] = await db.select().from(tenants).where(eq(tenants.tenantId, id)).limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const agents = await db
      .select()
      .from(signalsAgents)
      .where(eq(signalsAgents.tenantId, id))
      .orderBy(signalsAgents.name);

    const list = agents.map((a) => ({
      id: a.id,
      agent_url: a.agentUrl,
      name: a.name,
      enabled: a.enabled,
      auth_type: a.authType,
      has_auth: Boolean(a.authCredentials),
      forward_promoted_offering: a.forwardPromotedOffering,
      timeout: a.timeout,
      created_at: a.createdAt?.toISOString() ?? null,
    }));

    return reply.send({ tenant_id: id, tenant_name: tenant.name, custom_agents: list });
  });

  fastify.get("/tenant/:id/signals-agents/add", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const [tenant] = await db.select({ tenantId: tenants.tenantId, name: tenants.name }).from(tenants).where(eq(tenants.tenantId, id)).limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    return reply.send({ tenant_id: tenant.tenantId, tenant_name: tenant.name, agent: null, mode: "add" });
  });

  fastify.post("/tenant/:id/signals-agents/add", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    request.auditOperation = "add_signals_agent";

    const body = (request.body ?? {}) as Record<string, unknown>;
    const agentUrl = typeof body.agent_url === "string" ? body.agent_url.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const enabled = body.enabled === true || body.enabled === "on";
    const authType = typeof body.auth_type === "string" ? body.auth_type.trim() || null : null;
    const authHeader = typeof body.auth_header === "string" ? body.auth_header.trim() || null : null;
    const authCredentials = typeof body.auth_credentials === "string" ? body.auth_credentials.trim() || null : null;
    const forwardPromotedOffering = body.forward_promoted_offering === true || body.forward_promoted_offering === "on";
    const timeout = typeof body.timeout === "number" ? body.timeout : parseInt(String(body.timeout || "30"), 10) || 30;

    if (!agentUrl) return reply.code(400).send({ error: "Agent URL is required" });
    if (!name) return reply.code(400).send({ error: "Agent name is required" });
    const urlCheck = validateOutboundUrl(agentUrl, { allowHttp: true });
    if (!urlCheck.valid) return reply.code(400).send({ error: `Invalid agent URL: ${urlCheck.error}` });

    const [tenant] = await db.select().from(tenants).where(eq(tenants.tenantId, id)).limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const [inserted] = await db
      .insert(signalsAgents)
      .values({
        tenantId: id,
        agentUrl,
        name,
        enabled,
        authType,
        authHeader,
        authCredentials,
        forwardPromotedOffering,
        timeout,
      })
      .returning({ id: signalsAgents.id, name: signalsAgents.name });

    return reply.send({ success: true, id: inserted?.id, message: `Signals agent '${inserted?.name}' added successfully` });
  });

  fastify.get("/tenant/:id/signals-agents/:agentId/edit", async (request, reply) => {
    const { id, agentId } = request.params as { id: string; agentId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const numericId = parseInt(agentId, 10);
    if (Number.isNaN(numericId)) return reply.code(400).send({ error: "Invalid agent id" });

    const [tenant] = await db.select({ tenantId: tenants.tenantId, name: tenants.name }).from(tenants).where(eq(tenants.tenantId, id)).limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const [agent] = await db
      .select()
      .from(signalsAgents)
      .where(and(eq(signalsAgents.tenantId, id), eq(signalsAgents.id, numericId)))
      .limit(1);
    if (!agent) return reply.code(404).send({ error: "Signals agent not found" });

    return reply.send({
      tenant_id: tenant.tenantId,
      tenant_name: tenant.name,
      agent: {
        id: agent.id,
        agent_url: agent.agentUrl,
        name: agent.name,
        enabled: agent.enabled,
        auth_type: agent.authType,
        auth_header: agent.authHeader,
        auth_credentials: agent.authCredentials,
        forward_promoted_offering: agent.forwardPromotedOffering,
        timeout: agent.timeout,
      },
      mode: "edit",
    });
  });

  fastify.post("/tenant/:id/signals-agents/:agentId/edit", async (request, reply) => {
    const { id, agentId } = request.params as { id: string; agentId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    request.auditOperation = "edit_signals_agent";

    const numericId = parseInt(agentId, 10);
    if (Number.isNaN(numericId)) return reply.code(400).send({ error: "Invalid agent id" });

    const body = (request.body ?? {}) as Record<string, unknown>;
    const agentUrl = typeof body.agent_url === "string" ? body.agent_url.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const enabled = body.enabled === true || body.enabled === "on";
    const authType = typeof body.auth_type === "string" ? body.auth_type.trim() || null : null;
    const authHeader = typeof body.auth_header === "string" ? body.auth_header.trim() || null : null;
    const forwardPromotedOffering = body.forward_promoted_offering === true || body.forward_promoted_offering === "on";
    const timeout = typeof body.timeout === "number" ? body.timeout : parseInt(String(body.timeout || "30"), 10) || 30;

    const [agent] = await db
      .select()
      .from(signalsAgents)
      .where(and(eq(signalsAgents.tenantId, id), eq(signalsAgents.id, numericId)))
      .limit(1);
    if (!agent) return reply.code(404).send({ error: "Signals agent not found" });

    if (!agentUrl) return reply.code(400).send({ error: "Agent URL is required" });
    if (!name) return reply.code(400).send({ error: "Agent name is required" });
    const urlCheck = validateOutboundUrl(agentUrl, { allowHttp: true });
    if (!urlCheck.valid) return reply.code(400).send({ error: `Invalid agent URL: ${urlCheck.error}` });

    const authCredentials = typeof body.auth_credentials === "string" ? body.auth_credentials.trim() || null : undefined;

    await db
      .update(signalsAgents)
      .set({
        agentUrl: agentUrl || agent.agentUrl,
        name: name || agent.name,
        enabled,
        authType: authType ?? agent.authType,
        authHeader: authHeader ?? agent.authHeader,
        forwardPromotedOffering,
        timeout,
        authCredentials: authCredentials !== undefined ? authCredentials : agent.authCredentials,
        updatedAt: new Date(),
      })
      .where(and(eq(signalsAgents.tenantId, id), eq(signalsAgents.id, numericId)));

    return reply.send({ success: true, message: "Signals agent updated successfully" });
  });

  fastify.delete("/tenant/:id/signals-agents/:agentId", async (request, reply) => {
    const { id, agentId } = request.params as { id: string; agentId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const numericId = parseInt(agentId, 10);
    if (Number.isNaN(numericId)) return reply.code(400).send({ error: "Invalid agent id" });

    const [agent] = await db
      .select({ name: signalsAgents.name })
      .from(signalsAgents)
      .where(and(eq(signalsAgents.tenantId, id), eq(signalsAgents.id, numericId)))
      .limit(1);
    if (!agent) return reply.code(404).send({ error: "Signals agent not found" });

    await db.delete(signalsAgents).where(and(eq(signalsAgents.tenantId, id), eq(signalsAgents.id, numericId)));
    return reply.send({ success: true, message: `Signals agent '${agent.name}' deleted successfully` });
  });

  fastify.post("/tenant/:id/signals-agents/:agentId/test", async (request, reply) => {
    const { id, agentId } = request.params as { id: string; agentId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    request.auditOperation = "test_signals_agent";

    const numericId = parseInt(agentId, 10);
    if (Number.isNaN(numericId)) return reply.code(400).send({ error: "Invalid agent id" });

    const [agent] = await db
      .select()
      .from(signalsAgents)
      .where(and(eq(signalsAgents.tenantId, id), eq(signalsAgents.id, numericId)))
      .limit(1);
    if (!agent) return reply.code(404).send({ error: "Signals agent not found" });

    try {
      // Mirrors Python SignalsAgentRegistry.test_connection() — call get_signals
      // with a minimal test brief/deliver_to to verify the agent is reachable.
      const result = await callAgentMcpTool(
        agent.agentUrl,
        "get_signals",
        {
          signal_spec: "test",
          deliver_to: {
            countries: [],
            deployments: [{ type: "platform", platform: "all" }],
          },
        },
        agent.authHeader,
        agent.authCredentials,
        agent.timeout ? agent.timeout * 1000 : 30_000,
      );

      const signals = result["signals"];
      const signalCount = Array.isArray(signals) ? signals.length : 0;

      return reply.send({
        success: true,
        message: "Successfully connected to signals agent",
        signal_count: signalCount,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return reply.code(500).send({ success: false, error: `Connection failed: ${msg}` });
    }
  });
};

export default signalsAgentsRoute;
