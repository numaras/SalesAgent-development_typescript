import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { tenantAuthConfigs } from "../../../db/schema/users.js";
import { tenants } from "../../../db/schema/tenants.js";
import { requireTenantAccess } from "../../services/authGuard.js";
import { getAdminSession } from "../../services/sessionService.js";

const setupModeRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post("/tenant/:id/users/disable-setup-mode", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    request.auditOperation = "disable_auth_setup_mode";

    const session = getAdminSession(request);
    const authMethod = session.auth_method;
    if (authMethod !== "oidc") {
      return reply.code(403).send({
        success: false,
        error:
          "You must be logged in via SSO to disable setup mode. " +
          "Log out and log back in using 'Sign in with SSO' to verify SSO works.",
      });
    }

    const [tenant] = await db
      .select({ tenantId: tenants.tenantId })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);
    if (!tenant) return reply.code(404).send({ success: false, error: "Tenant not found" });

    const [authConfig] = await db
      .select({ oidcEnabled: tenantAuthConfigs.oidcEnabled })
      .from(tenantAuthConfigs)
      .where(eq(tenantAuthConfigs.tenantId, id))
      .limit(1);

    if (!authConfig?.oidcEnabled) {
      return reply.code(400).send({
        success: false,
        error: "SSO must be configured and enabled before disabling setup mode",
      });
    }

    await db
      .update(tenants)
      .set({ authSetupMode: false, updatedAt: new Date() })
      .where(eq(tenants.tenantId, id));

    return reply.send({
      success: true,
      message: "Setup mode disabled. Only SSO authentication is now allowed.",
    });
  });

  fastify.post("/tenant/:id/users/enable-setup-mode", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    request.auditOperation = "enable_auth_setup_mode";

    const [tenant] = await db
      .select({ tenantId: tenants.tenantId })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);
    if (!tenant) return reply.code(404).send({ success: false, error: "Tenant not found" });

    await db
      .update(tenants)
      .set({ authSetupMode: true, updatedAt: new Date() })
      .where(eq(tenants.tenantId, id));

    return reply.send({
      success: true,
      message: "Setup mode enabled. Test credentials now work.",
    });
  });
};

export default setupModeRoute;
