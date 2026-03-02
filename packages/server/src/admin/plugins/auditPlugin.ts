/**
 * Audit plugin: onResponse hook logs admin actions to audit_logs when request.auditOperation is set.
 * Parity with _legacy log_admin_action decorator writing to audit_logs table.
 */
import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from "fastify";

import { db } from "../../db/client.js";
import { auditLogs } from "../../db/schema/auditLogs.js";
import { getAdminSession } from "../services/sessionService.js";

declare module "fastify" {
  interface FastifyRequest {
    auditOperation?: string;
    auditDetails?: Record<string, unknown>;
    auditSuccess?: boolean;
    auditErrorMessage?: string;
  }
}

const auditPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.decorateRequest("auditOperation", undefined);
  fastify.decorateRequest("auditDetails", undefined);
  fastify.decorateRequest("auditSuccess", undefined);
  fastify.decorateRequest("auditErrorMessage", undefined);

  fastify.addHook("onResponse", async (request: FastifyRequest, reply) => {
    const operation = request.auditOperation;
    if (!operation) return;

    const session = getAdminSession(request);
    const tenantId = session.tenant_id ?? (request.params as { id?: string; tenantId?: string }).id ?? (request.params as { tenantId?: string }).tenantId;
    if (!tenantId || typeof tenantId !== "string") return;

    const principalName = session.user ?? "unknown";
    const principalId = principalName;
    const statusCode = reply.statusCode;
    const success = request.auditSuccess ?? (typeof statusCode === "number" && statusCode >= 200 && statusCode < 400);
    const errorMessage = request.auditErrorMessage ?? null;
    const details = request.auditDetails ?? {};

    try {
      await db.insert(auditLogs).values({
        tenantId,
        operation,
        principalName,
        principalId,
        adapterId: "admin_ui",
        success: Boolean(success),
        errorMessage: errorMessage ?? undefined,
        details: Object.keys(details).length > 0 ? details : undefined,
      });
    } catch (e) {
      request.log.warn(e, "Failed to write audit log");
    }
  });
};

export default auditPlugin;
