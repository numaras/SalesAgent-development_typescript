import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { propertyTags } from "../../../db/schema/propertyTags.js";
import { tenants } from "../../../db/schema/tenants.js";
import { requireTenantAccess } from "../../services/authGuard.js";

const propertyTagsRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/tenant/:id/property-tags", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const [tenant] = await db
      .select({ tenantId: tenants.tenantId, name: tenants.name })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const [allInventory] = await db
      .select()
      .from(propertyTags)
      .where(and(eq(propertyTags.tenantId, id), eq(propertyTags.tagId, "all_inventory")))
      .limit(1);

    if (!allInventory) {
      await db.insert(propertyTags).values({
        tagId: "all_inventory",
        tenantId: id,
        name: "All Inventory",
        description:
          "Default tag that applies to all properties. Used when no specific targeting is needed.",
      });
    }

    const tags = await db
      .select()
      .from(propertyTags)
      .where(eq(propertyTags.tenantId, id))
      .orderBy(propertyTags.name);

    return reply.send({
      tenant_id: tenant.tenantId,
      tenant_name: tenant.name,
      tags: tags.map((t) => ({
        tag_id: t.tagId,
        tenant_id: t.tenantId,
        name: t.name,
        description: t.description,
        created_at: t.createdAt?.toISOString() ?? null,
        updated_at: t.updatedAt?.toISOString() ?? null,
      })),
    });
  });

  fastify.post("/tenant/:id/property-tags/create", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;
    request.auditOperation = "create_property_tag";

    const body = (request.body ?? {}) as Record<string, unknown>;
    let tagId = typeof body.tag_id === "string" ? body.tag_id.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";

    if (!tagId || !name || !description) {
      return reply.code(400).send({ error: "tag_id, name, and description are required" });
    }

    const sanitized = tagId.toLowerCase().replace(/-/g, "_");
    if (!/^[a-z0-9_]+$/.test(sanitized)) {
      return reply.code(400).send({ error: "tag_id must contain only letters, numbers, and underscores" });
    }
    tagId = sanitized;

    const [tenant] = await db
      .select({ tenantId: tenants.tenantId })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const [existing] = await db
      .select({ tagId: propertyTags.tagId })
      .from(propertyTags)
      .where(and(eq(propertyTags.tenantId, id), eq(propertyTags.tagId, tagId)))
      .limit(1);
    if (existing) return reply.code(400).send({ error: `Tag '${tagId}' already exists` });

    await db.insert(propertyTags).values({
      tagId,
      tenantId: id,
      name,
      description,
    });

    return reply.send({
      success: true,
      tag_id: tagId,
      message: `Tag '${name}' created successfully`,
    });
  });
};

export default propertyTagsRoute;
