import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { randomBytes } from "node:crypto";

import { db } from "../../../db/client.js";
import { mediaBuys } from "../../../db/schema/mediaBuys.js";
import { principals } from "../../../db/schema/principals.js";
import { tenants } from "../../../db/schema/tenants.js";
import { requireTenantAccess } from "../../services/authGuard.js";

function generatePrincipalId(): string {
  return "prin_" + randomBytes(4).toString("hex");
}
function generateAccessToken(): string {
  return "tok_" + randomBytes(24).toString("base64url");
}

const principalsCrudRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/tenant/:id/principals", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const [tenant] = await db.select().from(tenants).where(eq(tenants.tenantId, id)).limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const rows = await db
      .select({
        principalId: principals.principalId,
        name: principals.name,
        accessToken: principals.accessToken,
        platformMappings: principals.platformMappings,
        createdAt: principals.createdAt,
        mediaBuyCount: sql<number>`count(${mediaBuys.mediaBuyId})::int`,
      })
      .from(principals)
      .leftJoin(mediaBuys, and(eq(mediaBuys.tenantId, id), eq(mediaBuys.principalId, principals.principalId)))
      .where(eq(principals.tenantId, id))
      .groupBy(principals.principalId, principals.name, principals.accessToken, principals.platformMappings, principals.createdAt)
      .orderBy(principals.name);

    const list = rows.map((r) => ({
      principal_id: r.principalId,
      name: r.name,
      access_token: r.accessToken,
      platform_mappings: r.platformMappings ?? {},
      media_buy_count: Number(r.mediaBuyCount ?? 0),
      created_at: r.createdAt?.toISOString() ?? null,
    }));

    return reply.send({ tenant_id: id, principals: list });
  });

  fastify.get("/tenant/:id/principals/create", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const [tenant] = await db.select({ tenantId: tenants.tenantId, name: tenants.name }).from(tenants).where(eq(tenants.tenantId, id)).limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    return reply.send({ tenant_id: tenant.tenantId, tenant_name: tenant.name, mode: "create" });
  });

  fastify.post("/tenant/:id/principals/create", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;
    request.auditOperation = "create_principal";

    const body = (request.body ?? {}) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return reply.code(400).send({ error: "Principal name is required" });

    const gamAdvertiserId = typeof body.gam_advertiser_id === "string" ? body.gam_advertiser_id.trim() : "";
    const enableMock = body.enable_mock === true || body.enable_mock === "on";

    const platformMappings: Record<string, unknown> = {};
    if (gamAdvertiserId) {
      const n = parseInt(gamAdvertiserId, 10);
      if (Number.isNaN(n)) return reply.code(400).send({ error: "GAM Advertiser ID must be numeric" });
      platformMappings.google_ad_manager = { advertiser_id: gamAdvertiserId, enabled: true };
    }
    if (enableMock) {
      const principalId = generatePrincipalId();
      platformMappings.mock = { advertiser_id: `mock_${principalId}`, enabled: true };
    }

    const [existing] = await db.select().from(principals).where(and(eq(principals.tenantId, id), eq(principals.name, name))).limit(1);
    if (existing) return reply.code(400).send({ error: `An advertiser named '${name}' already exists` });

    const principalId = generatePrincipalId();
    const accessToken = generateAccessToken();

    await db.insert(principals).values({
      tenantId: id,
      principalId,
      name,
      accessToken,
      platformMappings: platformMappings as Record<string, string>,
    });

    return reply.send({ success: true, principal_id: principalId, name, message: `Advertiser '${name}' created successfully` });
  });

  fastify.get("/tenant/:id/principals/:principalId/edit", async (request, reply) => {
    const { id, principalId } = request.params as { id: string; principalId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const [tenant] = await db.select({ tenantId: tenants.tenantId, name: tenants.name }).from(tenants).where(eq(tenants.tenantId, id)).limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const [principal] = await db.select().from(principals).where(and(eq(principals.tenantId, id), eq(principals.principalId, principalId))).limit(1);
    if (!principal) return reply.code(404).send({ error: "Principal not found" });

    const mappings = (principal.platformMappings ?? {}) as Record<string, unknown>;
    const gamMapping = mappings.google_ad_manager as Record<string, unknown> | undefined;
    const existingGamId = gamMapping?.advertiser_id ?? gamMapping?.company_id ?? null;

    return reply.send({
      tenant_id: tenant.tenantId,
      tenant_name: tenant.name,
      mode: "edit",
      principal: {
        principal_id: principal.principalId,
        name: principal.name,
        access_token: principal.accessToken,
        platform_mappings: principal.platformMappings,
        created_at: principal.createdAt?.toISOString() ?? null,
      },
      existing_gam_id: existingGamId,
    });
  });

  fastify.post("/tenant/:id/principals/:principalId/edit", async (request, reply) => {
    const { id, principalId } = request.params as { id: string; principalId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;
    request.auditOperation = "edit_principal";

    const body = (request.body ?? {}) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : null;
    const gamAdvertiserId = typeof body.gam_advertiser_id === "string" ? body.gam_advertiser_id.trim() : "";

    const [principal] = await db.select().from(principals).where(and(eq(principals.tenantId, id), eq(principals.principalId, principalId))).limit(1);
    if (!principal) return reply.code(404).send({ error: "Principal not found" });

    const platformMappings: Record<string, unknown> = {};
    if (gamAdvertiserId) {
      const n = parseInt(gamAdvertiserId, 10);
      if (Number.isNaN(n)) return reply.code(400).send({ error: "GAM Advertiser ID must be numeric" });
      platformMappings.google_ad_manager = { advertiser_id: gamAdvertiserId, enabled: true };
    }

    await db
      .update(principals)
      .set({
        name: name ?? principal.name,
        platformMappings: platformMappings as Record<string, string>,
        updatedAt: new Date(),
      })
      .where(and(eq(principals.tenantId, id), eq(principals.principalId, principalId)));

    return reply.send({ success: true, message: `Advertiser updated successfully` });
  });

  fastify.delete("/tenant/:id/principals/:principalId/delete", async (request, reply) => {
    const { id, principalId } = request.params as { id: string; principalId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;
    request.auditOperation = "delete_principal";

    const [principal] = await db.select({ name: principals.name }).from(principals).where(and(eq(principals.tenantId, id), eq(principals.principalId, principalId))).limit(1);
    if (!principal) return reply.code(404).send({ error: "Principal not found" });

    await db.delete(principals).where(and(eq(principals.tenantId, id), eq(principals.principalId, principalId)));
    return reply.send({ success: true, message: `Principal '${principal.name}' deleted successfully` });
  });

  fastify.post("/tenant/:id/principals/:principalId/delete", async (request, reply) => {
    const { id, principalId } = request.params as { id: string; principalId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;
    request.auditOperation = "delete_principal";

    const [principal] = await db.select({ name: principals.name }).from(principals).where(and(eq(principals.tenantId, id), eq(principals.principalId, principalId))).limit(1);
    if (!principal) return reply.code(404).send({ error: "Principal not found" });

    await db.delete(principals).where(and(eq(principals.tenantId, id), eq(principals.principalId, principalId)));
    return reply.send({ success: true, message: `Principal '${principal.name}' deleted successfully` });
  });
};

export default principalsCrudRoute;
