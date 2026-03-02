import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { tenantAuthConfigs } from "../../../db/schema/users.js";
import { clearAdminSession, getAdminSession } from "../../services/sessionService.js";

const logoutRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/logout", async (request, reply) => {
    const session = getAdminSession(request);
    const tenantId = typeof session.tenant_id === "string" ? session.tenant_id : null;
    let idpLogoutUrl: string | null = null;

    if (tenantId) {
      const [authConfig] = await db
        .select({ oidcLogoutUrl: tenantAuthConfigs.oidcLogoutUrl })
        .from(tenantAuthConfigs)
        .where(eq(tenantAuthConfigs.tenantId, tenantId))
        .limit(1);
      if (authConfig?.oidcLogoutUrl && authConfig.oidcLogoutUrl.trim()) {
        idpLogoutUrl = authConfig.oidcLogoutUrl.trim();
      }
    }

    clearAdminSession(request);

    if (idpLogoutUrl) {
      return reply.redirect(idpLogoutUrl);
    }

    return reply.redirect("/login?logged_out=1");
  });
};

export default logoutRoute;
