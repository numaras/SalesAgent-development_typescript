import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { auditLogs } from "../../../db/schema/auditLogs.js";
import { tenants } from "../../../db/schema/tenants.js";
import { requireTenantAccess } from "../../services/authGuard.js";
import { getAdminSession } from "../../services/sessionService.js";

function getApproximatedApiKey(): string | null {
  const key = process.env["APPROXIMATED_API_KEY"]?.trim();
  return key && key.length > 0 ? key : null;
}

function normalizeDomain(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

async function approximatedRequest(
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: unknown,
): Promise<Response> {
  const apiKey = getApproximatedApiKey();
  if (!apiKey) {
    throw new Error("APPROXIMATED_NOT_CONFIGURED");
  }
  return fetch(`https://cloud.approximated.app/api${path}`, {
    method,
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const approximatedSettingsRoute: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  fastify.post(
    "/tenant/:id/settings/approximated-domain-status",
    async (request, reply) => {
      const { id } = request.params as { id: string };
      if (!(await requireTenantAccess(request, reply, id))) return;

      const body = (request.body ?? {}) as Record<string, unknown>;
      const domain = normalizeDomain(body.domain);
      if (!domain) return reply.code(400).send({ success: false, error: "Domain required" });

      try {
        const response = await approximatedRequest(
          "GET",
          `/vhosts/by/incoming/${encodeURIComponent(domain)}`,
        );
        if (response.status === 404) {
          return reply.send({ success: true, registered: false });
        }
        if (!response.ok) {
          return reply
            .code(500)
            .send({ success: false, error: `API error: ${response.status}` });
        }
        const payload = (await response.json()) as Record<string, unknown>;
        const data =
          payload.data && typeof payload.data === "object"
            ? (payload.data as Record<string, unknown>)
            : payload;
        const status = typeof data.status === "string" ? data.status : "";
        return reply.send({
          success: true,
          registered: true,
          status,
          tls_enabled: Boolean(data.has_ssl),
          ssl_active: status.startsWith("ACTIVE_SSL"),
          target_address:
            typeof data.target_address === "string" ? data.target_address : null,
        });
      } catch (error) {
        const message =
          error instanceof Error && error.message === "APPROXIMATED_NOT_CONFIGURED"
            ? "Approximated not configured"
            : String(error);
        return reply.code(500).send({ success: false, error: message });
      }
    },
  );

  fastify.post(
    "/tenant/:id/settings/approximated-register-domain",
    async (request, reply) => {
      const { id } = request.params as { id: string };
      if (!(await requireTenantAccess(request, reply, id))) return;

      const session = getAdminSession(request);
      const body = (request.body ?? {}) as Record<string, unknown>;
      const domain = normalizeDomain(body.domain);
      if (!domain) return reply.code(400).send({ success: false, error: "Domain required" });

      const [tenant] = await db
        .select({ tenantId: tenants.tenantId, virtualHost: tenants.virtualHost })
        .from(tenants)
        .where(eq(tenants.tenantId, id))
        .limit(1);
      if (!tenant) return reply.code(404).send({ success: false, error: "Tenant not found" });
      if ((tenant.virtualHost ?? "").toLowerCase() !== domain) {
        return reply
          .code(400)
          .send({ success: false, error: "Domain must match tenant's virtual_host" });
      }

      const backendUrl =
        process.env["APPROXIMATED_BACKEND_URL"] ?? "adcp-sales-agent.fly.dev";
      try {
        const response = await approximatedRequest("POST", "/vhosts", {
          incoming_address: domain,
          target_address: backendUrl,
        });
        if (response.status === 200 || response.status === 201) {
          const actor = typeof session.user === "string" ? session.user : "unknown";
          try {
            await db.insert(auditLogs).values({
              tenantId: id,
              operation: "register_approximated_domain",
              principalName: actor,
              adapterId: "admin_ui",
              success: true,
              details: { domain },
            });
          } catch { /* audit failure must not block response */ }
          return reply.send({
            success: true,
            message: `Domain ${domain} registered successfully`,
          });
        }
        if (response.status === 409) {
          return reply.send({
            success: true,
            message: `Domain ${domain} already registered`,
          });
        }
        const text = await response.text();
        return reply
          .code(response.status)
          .send({ success: false, error: `Approximated API error: ${response.status} - ${text}` });
      } catch (error) {
        const message =
          error instanceof Error && error.message === "APPROXIMATED_NOT_CONFIGURED"
            ? "Approximated not configured"
            : String(error);
        return reply.code(500).send({ success: false, error: message });
      }
    },
  );

  fastify.post(
    "/tenant/:id/settings/approximated-unregister-domain",
    async (request, reply) => {
      const { id } = request.params as { id: string };
      if (!(await requireTenantAccess(request, reply, id))) return;

      const session = getAdminSession(request);
      const body = (request.body ?? {}) as Record<string, unknown>;
      const domain = normalizeDomain(body.domain);
      if (!domain) return reply.code(400).send({ success: false, error: "Domain required" });
      try {
        const response = await approximatedRequest(
          "DELETE",
          `/vhosts/by/incoming/${encodeURIComponent(domain)}`,
        );
        if (response.status === 200 || response.status === 204) {
          const actor = typeof session.user === "string" ? session.user : "unknown";
          try {
            await db.insert(auditLogs).values({
              tenantId: id,
              operation: "unregister_approximated_domain",
              principalName: actor,
              adapterId: "admin_ui",
              success: true,
              details: { domain },
            });
          } catch { /* audit failure must not block response */ }
          return reply.send({
            success: true,
            message: `Domain ${domain} unregistered successfully`,
          });
        }
        if (response.status === 404) {
          return reply.send({
            success: true,
            message: `Domain ${domain} was not registered`,
          });
        }
        const text = await response.text();
        return reply
          .code(response.status)
          .send({ success: false, error: `Approximated API error: ${response.status} - ${text}` });
      } catch (error) {
        const message =
          error instanceof Error && error.message === "APPROXIMATED_NOT_CONFIGURED"
            ? "Approximated not configured"
            : String(error);
        return reply.code(500).send({ success: false, error: message });
      }
    },
  );

  fastify.post("/tenant/:id/settings/approximated-token", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const [tenant] = await db
      .select({ tenantId: tenants.tenantId })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);
    if (!tenant) return reply.code(404).send({ success: false, error: "Tenant not found" });

    const proxyIp = process.env["APPROXIMATED_PROXY_IP"] ?? "37.16.24.200";
    try {
      const response = await approximatedRequest("GET", "/dns/token");
      if (!response.ok) {
        return reply
          .code(response.status)
          .send({ success: false, error: `API error: ${response.status}` });
      }
      const payload = (await response.json()) as Record<string, unknown>;
      return reply.send({
        success: true,
        token: typeof payload.token === "string" ? payload.token : null,
        proxy_ip: proxyIp,
      });
    } catch (error) {
      const message =
        error instanceof Error && error.message === "APPROXIMATED_NOT_CONFIGURED"
          ? "DNS widget not configured on server"
          : String(error);
      return reply.code(500).send({ success: false, error: message });
    }
  });
};

export default approximatedSettingsRoute;
