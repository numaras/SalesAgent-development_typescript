import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { randomUUID } from "node:crypto";

import { db } from "../../../db/client.js";
import { principals } from "../../../db/schema/principals.js";
import { pushNotificationConfigs } from "../../../db/schema/pushNotificationConfigs.js";
import { requireTenantAccess } from "../../services/authGuard.js";

function isPrivateIp(hostname: string): boolean {
  // RFC-1918 + link-local + loopback
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  if (a === 127) return true;
  return false;
}

function isValidWebhookUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (!["http:", "https:"].includes(u.protocol)) return false;
    const host = u.hostname.toLowerCase();
    if (host === "localhost" || host === "0.0.0.0") return false;
    if (isPrivateIp(host)) return false;
    return true;
  } catch {
    return false;
  }
}

const principalWebhooksRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/tenant/:id/principals/:principalId/webhooks", async (request, reply) => {
    const { id, principalId } = request.params as { id: string; principalId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const [principal] = await db
      .select({ principalId: principals.principalId, name: principals.name })
      .from(principals)
      .where(and(eq(principals.tenantId, id), eq(principals.principalId, principalId)))
      .limit(1);
    if (!principal) return reply.code(404).send({ error: "Principal not found" });

    const configs = await db
      .select()
      .from(pushNotificationConfigs)
      .where(and(eq(pushNotificationConfigs.tenantId, id), eq(pushNotificationConfigs.principalId, principalId)));

    const webhooks = configs.map((c) => ({
      config_id: c.id,
      url: c.url,
      auth_type: c.authenticationType,
      is_active: c.isActive,
      created_at: c.createdAt?.toISOString() ?? null,
    }));

    return reply.send({ tenant_id: id, principal_id: principalId, principal_name: principal.name, webhooks });
  });

  fastify.post("/tenant/:id/principals/:principalId/webhooks/register", async (request, reply) => {
    const { id, principalId } = request.params as { id: string; principalId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;
    request.auditOperation = "register_webhook";

    const body = (request.body ?? {}) as Record<string, unknown>;
    const url = typeof body.url === "string" ? body.url.trim() : "";
    const authType = typeof body.auth_type === "string" ? body.auth_type : "none";
    if (!url) return reply.code(400).send({ error: "url is required" });

    if (!isValidWebhookUrl(url)) return reply.code(400).send({ error: "Invalid webhook URL" });

    if (authType === "hmac_sha256") {
      const secret = typeof body.hmac_secret === "string" ? body.hmac_secret : "";
      if (!secret) return reply.code(400).send({ error: "HMAC secret is required for HMAC authentication" });
    }

    const [existingPrincipal] = await db
      .select()
      .from(principals)
      .where(and(eq(principals.tenantId, id), eq(principals.principalId, principalId)))
      .limit(1);
    if (!existingPrincipal) return reply.code(404).send({ error: "Principal not found" });

    const [existing] = await db
      .select()
      .from(pushNotificationConfigs)
      .where(
        and(
          eq(pushNotificationConfigs.tenantId, id),
          eq(pushNotificationConfigs.principalId, principalId),
          eq(pushNotificationConfigs.url, url),
        ),
      )
      .limit(1);
    if (existing) return reply.code(400).send({ error: "Webhook URL already registered for this principal" });

    const configId = `pnc_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const webhookSecret = authType === "hmac_sha256" && typeof body.hmac_secret === "string" ? body.hmac_secret : null;

    await db.insert(pushNotificationConfigs).values({
      id: configId,
      tenantId: id,
      principalId,
      url,
      authenticationType: authType !== "none" ? authType : null,
      webhookSecret,
      isActive: true,
    });

    return reply.send({ success: true, config_id: configId, message: "Webhook registered successfully" });
  });

  fastify.post("/tenant/:id/principals/:principalId/webhooks/:configId/delete", async (request, reply) => {
    const { id, principalId, configId } = request.params as { id: string; principalId: string; configId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;
    request.auditOperation = "delete_webhook";

    const [webhook] = await db
      .select()
      .from(pushNotificationConfigs)
      .where(
        and(
          eq(pushNotificationConfigs.tenantId, id),
          eq(pushNotificationConfigs.principalId, principalId),
          eq(pushNotificationConfigs.id, configId),
        ),
      )
      .limit(1);
    if (!webhook) return reply.code(404).send({ error: "Webhook not found" });

    await db
      .delete(pushNotificationConfigs)
      .where(
        and(
          eq(pushNotificationConfigs.tenantId, id),
          eq(pushNotificationConfigs.principalId, principalId),
          eq(pushNotificationConfigs.id, configId),
        ),
      );

    return reply.send({ success: true, message: "Webhook deleted successfully" });
  });

  fastify.post("/tenant/:id/principals/:principalId/webhooks/:configId/toggle", async (request, reply) => {
    const { id, principalId, configId } = request.params as { id: string; principalId: string; configId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;
    request.auditOperation = "toggle_webhook";

    const [webhook] = await db
      .select()
      .from(pushNotificationConfigs)
      .where(
        and(
          eq(pushNotificationConfigs.tenantId, id),
          eq(pushNotificationConfigs.principalId, principalId),
          eq(pushNotificationConfigs.id, configId),
        ),
      )
      .limit(1);
    if (!webhook) return reply.code(404).send({ error: "Webhook not found" });

    const newActive = !webhook.isActive;
    await db
      .update(pushNotificationConfigs)
      .set({ isActive: newActive, updatedAt: new Date() })
      .where(
        and(
          eq(pushNotificationConfigs.tenantId, id),
          eq(pushNotificationConfigs.principalId, principalId),
          eq(pushNotificationConfigs.id, configId),
        ),
      );

    return reply.send({ success: true, is_active: newActive });
  });
};

export default principalWebhooksRoute;
