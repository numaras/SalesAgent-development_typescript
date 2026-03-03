import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { creativeAgents } from "../../../db/schema/agents.js";
import { tenants } from "../../../db/schema/tenants.js";
import { validateOutboundUrl } from "../../../security/outboundUrl.js";
import { requireTenantAccess } from "../../services/authGuard.js";

/**
 * Minimal MCP Streamable HTTP client for testing agent connectivity.
 * Mirrors Python's CreativeAgentRegistry._fetch_formats_from_agent() /
 * SignalsAgentRegistry.test_connection() — calls the agent's MCP endpoint,
 * returns the raw tool-result object or throws on failure.
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

function parseTimeoutSeconds(raw: unknown): number {
  const parsed = typeof raw === "number" ? raw : parseInt(String(raw ?? "30"), 10);
  if (!Number.isFinite(parsed)) return 30;
  return Math.max(1, Math.min(300, parsed));
}

const creativeAgentsRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/tenant/:id/creative-agents/", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const [tenant] = await db.select().from(tenants).where(eq(tenants.tenantId, id)).limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const agents = await db
      .select()
      .from(creativeAgents)
      .where(eq(creativeAgents.tenantId, id))
      .orderBy(creativeAgents.priority);

    const list = agents.map((a) => ({
      id: a.id,
      agent_url: a.agentUrl,
      name: a.name,
      enabled: a.enabled,
      priority: a.priority,
      timeout: a.timeout,
      auth_type: a.authType,
      has_auth: Boolean(a.authCredentials),
      created_at: a.createdAt?.toISOString() ?? null,
    }));

    return reply.send({ tenant_id: id, tenant_name: tenant.name, custom_agents: list });
  });

  fastify.get("/tenant/:id/creative-agents/add", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const [tenant] = await db.select({ tenantId: tenants.tenantId, name: tenants.name }).from(tenants).where(eq(tenants.tenantId, id)).limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    return reply.send({ tenant_id: tenant.tenantId, tenant_name: tenant.name, agent: null, mode: "add" });
  });

  fastify.post("/tenant/:id/creative-agents/add", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    request.auditOperation = "add_creative_agent";

    const body = (request.body ?? {}) as Record<string, unknown>;
    const agentUrl = typeof body.agent_url === "string" ? body.agent_url.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const enabled = body.enabled === true || body.enabled === "on";
    const priority = typeof body.priority === "number" ? body.priority : parseInt(String(body.priority || "10"), 10) || 10;
    const timeout = parseTimeoutSeconds(body.timeout);
    const authType = typeof body.auth_type === "string" ? body.auth_type.trim() || null : null;
    const authCredentials = typeof body.auth_credentials === "string" ? body.auth_credentials.trim() || null : null;

    if (!agentUrl) return reply.code(400).send({ error: "Agent URL is required" });
    if (!name) return reply.code(400).send({ error: "Agent name is required" });
    const urlCheck = validateOutboundUrl(agentUrl, { allowHttp: true });
    if (!urlCheck.valid) return reply.code(400).send({ error: `Invalid agent URL: ${urlCheck.error}` });

    const [tenant] = await db.select().from(tenants).where(eq(tenants.tenantId, id)).limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const [inserted] = await db
      .insert(creativeAgents)
      .values({
        tenantId: id,
        agentUrl,
        name,
        enabled,
        priority,
        timeout,
        authType,
        authHeader: typeof body.auth_header === "string" ? body.auth_header.trim() || null : null,
        authCredentials,
      })
      .returning({ id: creativeAgents.id, name: creativeAgents.name });

    return reply.send({ success: true, id: inserted?.id, message: `Creative agent '${inserted?.name}' added successfully` });
  });

  fastify.get("/tenant/:id/creative-agents/:agentId/edit", async (request, reply) => {
    const { id, agentId } = request.params as { id: string; agentId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const numericId = parseInt(agentId, 10);
    if (Number.isNaN(numericId)) return reply.code(400).send({ error: "Invalid agent id" });

    const [tenant] = await db.select({ tenantId: tenants.tenantId, name: tenants.name }).from(tenants).where(eq(tenants.tenantId, id)).limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const [agent] = await db
      .select()
      .from(creativeAgents)
      .where(and(eq(creativeAgents.tenantId, id), eq(creativeAgents.id, numericId)))
      .limit(1);
    if (!agent) return reply.code(404).send({ error: "Creative agent not found" });

    return reply.send({
      tenant_id: tenant.tenantId,
      tenant_name: tenant.name,
      agent: {
        id: agent.id,
        agent_url: agent.agentUrl,
        name: agent.name,
        enabled: agent.enabled,
        priority: agent.priority,
        timeout: agent.timeout,
        auth_type: agent.authType,
        auth_header: agent.authHeader,
        auth_credentials: agent.authCredentials,
      },
      mode: "edit",
    });
  });

  fastify.post("/tenant/:id/creative-agents/:agentId/edit", async (request, reply) => {
    const { id, agentId } = request.params as { id: string; agentId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    request.auditOperation = "edit_creative_agent";

    const numericId = parseInt(agentId, 10);
    if (Number.isNaN(numericId)) return reply.code(400).send({ error: "Invalid agent id" });

    const body = (request.body ?? {}) as Record<string, unknown>;
    const agentUrl = typeof body.agent_url === "string" ? body.agent_url.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const enabled = body.enabled === true || body.enabled === "on";
    const priority = typeof body.priority === "number" ? body.priority : parseInt(String(body.priority || "10"), 10) || 10;
    const timeout = parseTimeoutSeconds(body.timeout);
    const authType = typeof body.auth_type === "string" ? body.auth_type.trim() || null : null;
    const authCredentials = typeof body.auth_credentials === "string" ? body.auth_credentials.trim() || null : null;

    const [agent] = await db
      .select()
      .from(creativeAgents)
      .where(and(eq(creativeAgents.tenantId, id), eq(creativeAgents.id, numericId)))
      .limit(1);
    if (!agent) return reply.code(404).send({ error: "Creative agent not found" });

    if (!agentUrl) return reply.code(400).send({ error: "Agent URL is required" });
    if (!name) return reply.code(400).send({ error: "Agent name is required" });
    const urlCheck = validateOutboundUrl(agentUrl, { allowHttp: true });
    if (!urlCheck.valid) return reply.code(400).send({ error: `Invalid agent URL: ${urlCheck.error}` });

    await db
      .update(creativeAgents)
      .set({
        agentUrl: agentUrl || agent.agentUrl,
        name: name || agent.name,
        enabled,
        priority,
        timeout,
        authType: authType ?? agent.authType,
        authHeader: typeof body.auth_header === "string" ? body.auth_header.trim() || null : agent.authHeader,
        authCredentials: authCredentials !== undefined ? authCredentials : agent.authCredentials,
        updatedAt: new Date(),
      })
      .where(and(eq(creativeAgents.tenantId, id), eq(creativeAgents.id, numericId)));

    return reply.send({ success: true, message: "Creative agent updated successfully" });
  });

  fastify.delete("/tenant/:id/creative-agents/:agentId", async (request, reply) => {
    const { id, agentId } = request.params as { id: string; agentId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const numericId = parseInt(agentId, 10);
    if (Number.isNaN(numericId)) return reply.code(400).send({ error: "Invalid agent id" });

    const [agent] = await db
      .select({ name: creativeAgents.name })
      .from(creativeAgents)
      .where(and(eq(creativeAgents.tenantId, id), eq(creativeAgents.id, numericId)))
      .limit(1);
    if (!agent) return reply.code(404).send({ error: "Creative agent not found" });

    await db.delete(creativeAgents).where(and(eq(creativeAgents.tenantId, id), eq(creativeAgents.id, numericId)));
    return reply.send({ success: true, message: `Creative agent '${agent.name}' deleted successfully` });
  });

  fastify.post("/tenant/:id/creative-agents/:agentId/test", async (request, reply) => {
    const { id, agentId } = request.params as { id: string; agentId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    request.auditOperation = "test_creative_agent";

    const numericId = parseInt(agentId, 10);
    if (Number.isNaN(numericId)) return reply.code(400).send({ error: "Invalid agent id" });

    const [agent] = await db
      .select()
      .from(creativeAgents)
      .where(and(eq(creativeAgents.tenantId, id), eq(creativeAgents.id, numericId)))
      .limit(1);
    if (!agent) return reply.code(404).send({ error: "Creative agent not found" });

    try {
      const result = await callAgentMcpTool(
        agent.agentUrl,
        "list_creative_formats",
        {},
        agent.authHeader,
        agent.authCredentials,
        Math.max(1, agent.timeout) * 1000,
      );

      const formats = (result["formats"] as Array<{ name?: string }>) ?? [];
      if (formats.length === 0) {
        return reply.code(400).send({ success: false, error: "Agent returned no formats" });
      }

      return reply.send({
        success: true,
        message: `Successfully connected to '${agent.name}'`,
        format_count: formats.length,
        sample_formats: formats.slice(0, 5).map((f) => f.name ?? "Unknown"),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return reply.code(500).send({ success: false, error: `Connection failed: ${msg}` });
    }
  });
};

export default creativeAgentsRoute;
