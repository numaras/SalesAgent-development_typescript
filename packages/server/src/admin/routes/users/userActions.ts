import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { randomUUID } from "node:crypto";

import { db } from "../../../db/client.js";
import { users } from "../../../db/schema/users.js";
import { requireTenantAccess } from "../../services/authGuard.js";

const EMAIL_REGEX = /^[^@]+@[^@]+\.[^@]+$/;
const VALID_ROLES = ["admin", "manager", "viewer"] as const;

const userActionsRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post("/tenant/:id/users/add", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    request.auditOperation = "add_user";

    const body = (request.body ?? {}) as Record<string, unknown>;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const role = VALID_ROLES.includes((body.role as (typeof VALID_ROLES)[number]) ?? "viewer")
      ? (body.role as (typeof VALID_ROLES)[number])
      : "viewer";
    const nameInput = typeof body.name === "string" ? body.name.trim() : "";

    if (!email) return reply.code(400).send({ error: "Email is required" });
    if (!EMAIL_REGEX.test(email)) return reply.code(400).send({ error: "Invalid email format" });

    const [existing] = await db
      .select({ userId: users.userId })
      .from(users)
      .where(and(eq(users.tenantId, id), eq(users.email, email)))
      .limit(1);

    if (existing) return reply.code(400).send({ error: `User ${email} already exists` });

    const name = nameInput || email.split("@")[0];
    const userId = `user_${randomUUID().slice(0, 8)}`;

    await db.insert(users).values({
      tenantId: id,
      userId,
      email,
      name,
      role,
      isActive: true,
    });

    request.auditDetails = { email, role };

    return reply.send({
      success: true,
      user_id: userId,
      email,
      name,
      role,
    });
  });

  fastify.post("/tenant/:id/users/:userId/toggle", async (request, reply) => {
    const { id, userId } = request.params as { id: string; userId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    request.auditOperation = "toggle_user";

    const [user] = await db
      .select({ userId: users.userId, email: users.email, isActive: users.isActive })
      .from(users)
      .where(and(eq(users.tenantId, id), eq(users.userId, userId)))
      .limit(1);

    if (!user) return reply.code(404).send({ error: "User not found" });

    const newActive = !user.isActive;
    await db
      .update(users)
      .set({ isActive: newActive })
      .where(and(eq(users.tenantId, id), eq(users.userId, userId)));

    request.auditDetails = { user_id: userId, email: user.email, is_active: newActive };

    return reply.send({
      success: true,
      user_id: userId,
      email: user.email,
      is_active: newActive,
      status: newActive ? "activated" : "deactivated",
    });
  });

  fastify.post("/tenant/:id/users/:userId/update_role", async (request, reply) => {
    const { id, userId } = request.params as { id: string; userId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    request.auditOperation = "update_role";

    const body = (request.body ?? {}) as Record<string, unknown>;
    const newRole = typeof body.role === "string" ? body.role : null;
    if (!newRole || !VALID_ROLES.includes(newRole as (typeof VALID_ROLES)[number])) {
      return reply.code(400).send({ error: "Invalid role" });
    }

    const [user] = await db
      .select({ userId: users.userId, email: users.email })
      .from(users)
      .where(and(eq(users.tenantId, id), eq(users.userId, userId)))
      .limit(1);

    if (!user) return reply.code(404).send({ error: "User not found" });

    await db
      .update(users)
      .set({ role: newRole })
      .where(and(eq(users.tenantId, id), eq(users.userId, userId)));

    request.auditDetails = { user_id: userId, email: user.email, role: newRole };

    return reply.send({
      success: true,
      user_id: userId,
      email: user.email,
      role: newRole,
    });
  });
};

export default userActionsRoute;
