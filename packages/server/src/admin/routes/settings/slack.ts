import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";

import { db } from "../../../db/client.js";
import { auditLogs } from "../../../db/schema/auditLogs.js";
import { tenants } from "../../../db/schema/tenants.js";
import { requireTenantAccess } from "../../services/authGuard.js";
import { getAdminSession } from "../../services/sessionService.js";

// Blocked hostnames — cloud metadata services and localhost aliases
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "169.254.169.254",
  "metadata",
  "instance-data",
]);

// Blocked private/internal CIDR ranges (RFC 1918 + loopback + link-local)
const BLOCKED_CIDRS = [
  "10.0.0.0/8",
  "172.16.0.0/12",
  "192.168.0.0/16",
  "127.0.0.0/8",
  "169.254.0.0/16",
];

function ipToUint32(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map(Number);
  if (nums.some((n) => isNaN(n) || n < 0 || n > 255)) return null;
  return (((nums[0]! << 24) | (nums[1]! << 16) | (nums[2]! << 8) | nums[3]!) >>> 0);
}

function isInCidr(ip: string, cidr: string): boolean {
  const slashIdx = cidr.lastIndexOf("/");
  const networkStr = cidr.slice(0, slashIdx);
  const prefix = parseInt(cidr.slice(slashIdx + 1), 10);
  const networkNum = ipToUint32(networkStr);
  const ipNum = ipToUint32(ip);
  if (networkNum === null || ipNum === null) return false;
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return (ipNum & mask) === (networkNum & mask);
}

function isSafeWebhookUrl(url: string): { safe: boolean; reason?: string } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { safe: false, reason: "Invalid URL format" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { safe: false, reason: "Webhook URL must use http or https protocol" };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname) {
    return { safe: false, reason: "Webhook URL must have a valid hostname" };
  }

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { safe: false, reason: `Hostname '${hostname}' is blocked for security reasons` };
  }

  // If hostname is an IPv4 literal, validate against all blocked CIDR ranges
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    for (const cidr of BLOCKED_CIDRS) {
      if (isInCidr(hostname, cidr)) {
        return { safe: false, reason: `IP address ${hostname} falls in blocked range ${cidr} (private/internal network)` };
      }
    }
  }

  return { safe: true };
}

const slackSettingsRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  async function handleUpdateSlack(
    request: FastifyRequest,
    reply: FastifyReply,
    id: string,
  ) {
    const session = getAdminSession(request);

    const body = (request.body ?? {}) as Record<string, unknown>;
    const slackWebhookUrl =
      typeof body.slack_webhook_url === "string"
        ? body.slack_webhook_url.trim()
        : "";
    const slackAuditWebhookUrl =
      typeof body.slack_audit_webhook_url === "string"
        ? body.slack_audit_webhook_url.trim()
        : "";

    if (slackWebhookUrl) {
      const check = isSafeWebhookUrl(slackWebhookUrl);
      if (!check.safe) {
        return reply.code(400).send({ error: `Invalid Slack webhook URL: ${check.reason}` });
      }
    }
    if (slackAuditWebhookUrl) {
      const check = isSafeWebhookUrl(slackAuditWebhookUrl);
      if (!check.safe) {
        return reply.code(400).send({ error: `Invalid Slack audit webhook URL: ${check.reason}` });
      }
    }

    const [tenant] = await db
      .select({ tenantId: tenants.tenantId })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);
    if (!tenant) {
      return reply.code(404).send({ error: "Tenant not found" });
    }

    await db
      .update(tenants)
      .set({
        slackWebhookUrl: slackWebhookUrl || null,
        slackAuditWebhookUrl: slackAuditWebhookUrl || null,
        updatedAt: new Date(),
      })
      .where(eq(tenants.tenantId, id));

    const actor = typeof session.user === "string" ? session.user : "unknown";
    try {
      await db.insert(auditLogs).values({
        tenantId: id,
        operation: "update_slack",
        principalName: actor,
        adapterId: "admin_ui",
        success: true,
        details: { event_type: "update_slack" },
      });
    } catch { /* audit failure must not block response */ }

    return reply.send({
      success: true,
      message:
        slackWebhookUrl || slackAuditWebhookUrl
          ? "Slack integration updated successfully"
          : "Slack integration disabled",
    });
  }

  fastify.post("/tenant/:id/update_slack", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;
    return handleUpdateSlack(request, reply, id);
  });

  // Route alias matching Python settings.py
  fastify.post("/tenant/:id/settings/slack", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;
    return handleUpdateSlack(request, reply, id);
  });

  fastify.post("/tenant/:id/test_slack", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const [tenant] = await db
      .select({
        name: tenants.name,
        slackWebhookUrl: tenants.slackWebhookUrl,
      })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);
    if (!tenant) {
      return reply.code(404).send({ success: false, error: "Tenant not found" });
    }
    if (!tenant.slackWebhookUrl) {
      return reply
        .code(400)
        .send({ success: false, error: "No Slack webhook configured" });
    }

    try {
      const response = await fetch(tenant.slackWebhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: `Test message from Prebid Sales Agent for ${tenant.name}`,
        }),
      });
      if (!response.ok) {
        const text = await response.text();
        return reply.code(400).send({
          success: false,
          error: `Slack returned status ${response.status}: ${text}`,
        });
      }
      return reply.send({ success: true, message: "Test message sent successfully" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return reply.code(500).send({ success: false, error: message });
    }
  });
};

export default slackSettingsRoute;
