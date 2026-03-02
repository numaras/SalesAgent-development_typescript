import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { auditLogs } from "../../../db/schema/auditLogs.js";
import { tenants } from "../../../db/schema/tenants.js";
import { requireTenantAccess } from "../../services/authGuard.js";
import { getAdminSession } from "../../services/sessionService.js";

function readString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  return typeof value === "string" ? value.trim() : "";
}

const aiSettingsRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post("/tenant/:id/settings/ai", async (request, reply) => {
    const { id } = request.params as { id: string };

    if (!(await requireTenantAccess(request, reply, id))) return;

    const session = getAdminSession(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const provider = readString(body, "ai_provider") || "gemini";
    const model = readString(body, "ai_model");
    const apiKey = readString(body, "ai_api_key");
    const logfireToken = readString(body, "logfire_token");

    const [tenant] = await db
      .select({
        tenantId: tenants.tenantId,
        aiConfig: tenants.aiConfig,
        geminiApiKey: tenants.geminiApiKey,
      })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);
    if (!tenant) {
      return reply.code(404).send({ error: "Tenant not found" });
    }

    const existingConfig =
      tenant.aiConfig && typeof tenant.aiConfig === "object"
        ? (tenant.aiConfig as Record<string, unknown>)
        : {};

    const newConfig: Record<string, unknown> = {
      provider,
      model,
    };

    if (apiKey) {
      newConfig["api_key"] = apiKey;
    } else if (typeof existingConfig["api_key"] === "string") {
      newConfig["api_key"] = existingConfig["api_key"];
    } else if (tenant.geminiApiKey && provider === "gemini") {
      newConfig["api_key"] = tenant.geminiApiKey;
    }

    if (existingConfig["settings"] && typeof existingConfig["settings"] === "object") {
      newConfig["settings"] = existingConfig["settings"];
    }

    if (logfireToken && logfireToken !== "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022") {
      newConfig["logfire_token"] = logfireToken;
    } else if (typeof existingConfig["logfire_token"] === "string") {
      newConfig["logfire_token"] = existingConfig["logfire_token"];
    }

    await db
      .update(tenants)
      .set({
        aiConfig: newConfig,
        updatedAt: new Date(),
      })
      .where(eq(tenants.tenantId, id));

    const actor = typeof session.user === "string" ? session.user : "unknown";
    try {
      await db.insert(auditLogs).values({
        tenantId: id,
        operation: "update_ai",
        principalName: actor,
        adapterId: "admin_ui",
        success: true,
        details: { event_type: "update_ai" },
      });
    } catch { /* audit failure must not block response */ }

    return reply.send({
      success: true,
      message:
        typeof newConfig["api_key"] === "string"
          ? `AI settings saved. ${provider} (${model}) is now configured.`
          : `AI provider set to ${provider}, but no API key configured. AI features will be disabled.`,
      config: newConfig,
    });
  });
};

export default aiSettingsRoute;
