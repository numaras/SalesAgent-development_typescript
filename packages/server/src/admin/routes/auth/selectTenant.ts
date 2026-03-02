import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { users } from "../../../db/schema/users.js";
import {
  getAdminSession,
  redirectToNextOrDefault,
  setAdminSessionValue,
} from "../../services/sessionService.js";

interface AvailableTenant {
  tenant_id: string;
  name?: string;
  is_admin?: boolean;
}

async function ensureUserInTenant(
  email: string,
  tenantId: string,
  role: string,
  name: string,
): Promise<void> {
  const emailLower = email.toLowerCase();
  const [existing] = await db
    .select({ userId: users.userId, isActive: users.isActive })
    .from(users)
    .where(and(eq(users.email, emailLower), eq(users.tenantId, tenantId)))
    .limit(1);

  if (existing) {
    await db
      .update(users)
      .set({ isActive: true, lastLogin: new Date() })
      .where(and(eq(users.email, emailLower), eq(users.tenantId, tenantId)));
  } else {
    const { randomUUID } = await import("crypto");
    await db.insert(users).values({
      userId: randomUUID(),
      tenantId,
      email: emailLower,
      name: name || email.split("@")[0].replace(/\b\w/g, (c) => c.toUpperCase()),
      role,
      isActive: true,
      lastLogin: new Date(),
    });
  }
}

function getAvailableTenants(raw: unknown): AvailableTenant[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is AvailableTenant => {
    if (!item || typeof item !== "object") return false;
    const rec = item as Record<string, unknown>;
    return typeof rec.tenant_id === "string" && rec.tenant_id.trim().length > 0;
  });
}

const selectTenantRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/auth/select-tenant", async (request, reply) => {
    const session = getAdminSession(request);
    const tenants = getAvailableTenants(session.available_tenants);
    if (!session.user || tenants.length === 0) {
      return reply.redirect("/login");
    }

    return reply.send({
      tenants,
      is_single_tenant: process.env["SINGLE_TENANT_MODE"]?.toLowerCase() === "true",
    });
  });

  fastify.post("/auth/select-tenant", async (request, reply) => {
    const session = getAdminSession(request);
    const tenants = getAvailableTenants(session.available_tenants);
    if (!session.user || tenants.length === 0) {
      return reply.redirect("/login");
    }

    const body = (request.body ?? {}) as Record<string, unknown>;
    const tenantIdRaw = body.tenant_id;
    const tenantId = typeof tenantIdRaw === "string" ? tenantIdRaw.trim() : "";
    const selected = tenants.find((tenant) => tenant.tenant_id === tenantId);

    if (!selected) {
      return reply.code(400).send({
        error: "INVALID_TENANT_SELECTION",
        message: "Invalid tenant selection",
      });
    }

    const role = selected.is_admin ? "admin" : "viewer";
    const email = typeof session.user === "string" ? session.user : "";
    const userName =
      typeof session.user_name === "string"
        ? session.user_name
        : email.split("@")[0].replace(/\b\w/g, (c) => c.toUpperCase());

    try {
      await ensureUserInTenant(email, selected.tenant_id, role, userName);
    } catch {
      return reply.code(500).send({
        error: "USER_SETUP_FAILED",
        message: "Error setting up user access. Please contact support.",
      });
    }

    setAdminSessionValue(request, "tenant_id", selected.tenant_id);
    setAdminSessionValue(request, "is_tenant_admin", Boolean(selected.is_admin));
    setAdminSessionValue(request, "role", role);
    setAdminSessionValue(request, "available_tenants", undefined);

    return redirectToNextOrDefault(
      request,
      reply,
      `/tenant/${encodeURIComponent(selected.tenant_id)}/dashboard`,
    );
  });
};

export default selectTenantRoute;
