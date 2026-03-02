import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { tenantAuthConfigs } from "../../../db/schema/users.js";
import { tenants } from "../../../db/schema/tenants.js";
import { users } from "../../../db/schema/users.js";
import { requireTenantAccess } from "../../services/authGuard.js";

const listUsersRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/tenant/:id/users", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const [tenant] = await db
      .select({
        tenantId: tenants.tenantId,
        name: tenants.name,
        authorizedDomains: tenants.authorizedDomains,
        authSetupMode: tenants.authSetupMode,
      })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);

    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const usersList = await db
      .select({
        userId: users.userId,
        email: users.email,
        name: users.name,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        lastLogin: users.lastLogin,
      })
      .from(users)
      .where(eq(users.tenantId, id))
      .orderBy(users.email);

    const [authConfig] = await db
      .select({ oidcEnabled: tenantAuthConfigs.oidcEnabled })
      .from(tenantAuthConfigs)
      .where(eq(tenantAuthConfigs.tenantId, id))
      .limit(1);

    const authorizedDomains = tenant.authorizedDomains ?? [];
    const oidcEnabled = authConfig?.oidcEnabled ?? false;

    return reply.send({
      tenant_id: tenant.tenantId,
      tenant_name: tenant.name,
      users: usersList.map((u) => ({
        user_id: u.userId,
        email: u.email,
        name: u.name,
        role: u.role,
        is_active: u.isActive,
        created_at: u.createdAt?.toISOString() ?? null,
        last_login: u.lastLogin?.toISOString() ?? null,
      })),
      authorized_domains: authorizedDomains,
      auth_setup_mode: tenant.authSetupMode,
      oidc_enabled: oidcEnabled,
    });
  });
};

export default listUsersRoute;
