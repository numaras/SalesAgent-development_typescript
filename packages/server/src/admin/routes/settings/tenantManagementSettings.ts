/**
 * GET /settings and POST /settings/update — tenant management (super-admin) settings.
 * Parity with _legacy tenant_management_settings_bp: tenant_management_settings(), update_admin_settings();
 * Guard: super_admin only.
 */
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { getAdminSession } from "../../services/sessionService.js";

const tenantManagementSettingsRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/settings", async (request, reply) => {
    const session = getAdminSession(request);
    if (!session.user) return reply.code(401).send({ error: "UNAUTHENTICATED" });
    if (session.role !== "super_admin") {
      return reply.code(403).send({ error: "Forbidden: super-admin only" });
    }

    const gamClientId = process.env["GAM_OAUTH_CLIENT_ID"] ?? "";
    const gamClientSecret = process.env["GAM_OAUTH_CLIENT_SECRET"] ?? "";
    const gamConfigured = Boolean(gamClientId && gamClientSecret);
    const clientIdPrefix =
      gamClientId.length > 20 ? `${gamClientId.slice(0, 20)}...` : gamClientId;

    const configItems = {
      gam_oauth_status: {
        configured: gamConfigured,
        client_id_prefix: clientIdPrefix,
        description: "GAM OAuth credentials configured via environment variables",
      },
    };

    return reply.send({
      config_items: configItems,
      gam_configured: gamConfigured,
      gam_client_id_prefix: clientIdPrefix,
    });
  });

  fastify.post("/settings/update", async (request, reply) => {
    const session = getAdminSession(request);
    if (!session.user) return reply.code(401).send({ error: "UNAUTHENTICATED" });
    if (session.role !== "super_admin") {
      return reply.code(403).send({ error: "Forbidden: super-admin only" });
    }

    return reply.send({
      success: true,
      message:
        "GAM OAuth credentials are now configured via environment variables. No settings to update here.",
    });
  });
};

export default tenantManagementSettingsRoute;
