import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { randomUUID } from "node:crypto";

import { db } from "../../../db/client.js";
import { authorizedProperties } from "../../../db/schema/authorizedProperties.js";
import { tenants } from "../../../db/schema/tenants.js";
import { requireTenantAccess } from "../../services/authGuard.js";

const PROPERTY_TYPES = [
  "website",
  "mobile_app",
  "ctv_app",
  "dooh",
  "podcast",
  "radio",
  "streaming_audio",
] as const;

function parseIdentifiers(body: Record<string, unknown>): Array<{ type: string; value: string }> {
  const identifiers: Array<{ type: string; value: string }> = [];
  if (Array.isArray(body.identifiers)) {
    for (const item of body.identifiers) {
      if (item && typeof item === "object" && "type" in item && "value" in item) {
        const type = String((item as Record<string, unknown>).type ?? "").trim();
        const value = String((item as Record<string, unknown>).value ?? "").trim();
        if (type && value) identifiers.push({ type, value });
      }
    }
  }
  return identifiers;
}

const propertiesCrudRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/tenant/:id/authorized-properties", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const [tenant] = await db
      .select({ tenantId: tenants.tenantId, name: tenants.name })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const properties = await db
      .select()
      .from(authorizedProperties)
      .where(eq(authorizedProperties.tenantId, id))
      .orderBy(desc(authorizedProperties.createdAt));

    const property_counts = {
      total: properties.length,
      verified: properties.filter((p) => p.verificationStatus === "verified").length,
      pending: properties.filter((p) => p.verificationStatus === "pending").length,
      failed: properties.filter((p) => p.verificationStatus === "failed").length,
    };

    return reply.send({
      tenant_id: tenant.tenantId,
      tenant_name: tenant.name,
      properties: properties.map((p) => ({
        property_id: p.propertyId,
        tenant_id: p.tenantId,
        property_type: p.propertyType,
        name: p.name,
        identifiers: p.identifiers,
        tags: p.tags ?? [],
        publisher_domain: p.publisherDomain,
        verification_status: p.verificationStatus,
        verification_checked_at: p.verificationCheckedAt?.toISOString() ?? null,
        verification_error: p.verificationError,
        created_at: p.createdAt?.toISOString() ?? null,
        updated_at: p.updatedAt?.toISOString() ?? null,
      })),
      property_counts,
    });
  });

  fastify.get("/tenant/:id/authorized-properties/create", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const [tenant] = await db
      .select({ tenantId: tenants.tenantId, name: tenants.name })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    return reply.send({
      tenant_id: tenant.tenantId,
      tenant_name: tenant.name,
      existing_tags: [],
      property: null,
      mode: "create",
      property_types: [...PROPERTY_TYPES],
    });
  });

  fastify.post("/tenant/:id/authorized-properties/create", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;
    request.auditOperation = "create_property";

    const body = (request.body ?? {}) as Record<string, unknown>;
    const propertyType = typeof body.property_type === "string" ? body.property_type.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const publisherDomain = typeof body.publisher_domain === "string" ? body.publisher_domain.trim() : "";

    if (!propertyType || !name || !publisherDomain) {
      return reply.code(400).send({ error: "property_type, name, and publisher_domain are required" });
    }
    if (!PROPERTY_TYPES.includes(propertyType as (typeof PROPERTY_TYPES)[number])) {
      return reply.code(400).send({ error: `Invalid property_type. Valid: ${PROPERTY_TYPES.join(", ")}` });
    }

    const identifiers = parseIdentifiers(body);
    if (identifiers.length === 0) {
      return reply.code(400).send({ error: "At least one identifier (type + value) is required" });
    }

    const tags = Array.isArray(body.tags)
      ? (body.tags as unknown[]).map((t) => String(t).trim()).filter(Boolean)
      : [];

    const [tenant] = await db
      .select({ tenantId: tenants.tenantId })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const propertyId = randomUUID();
    await db.insert(authorizedProperties).values({
      propertyId,
      tenantId: id,
      propertyType,
      name,
      identifiers,
      tags: tags.length ? tags : null,
      publisherDomain,
      verificationStatus: "pending",
    });

    return reply.send({
      success: true,
      property_id: propertyId,
      message: `Property '${name}' created successfully`,
    });
  });

  fastify.get("/tenant/:id/authorized-properties/:propertyId/edit", async (request, reply) => {
    const { id, propertyId } = request.params as { id: string; propertyId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const [tenant] = await db
      .select({ tenantId: tenants.tenantId, name: tenants.name })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const [prop] = await db
      .select()
      .from(authorizedProperties)
      .where(
        and(
          eq(authorizedProperties.tenantId, id),
          eq(authorizedProperties.propertyId, propertyId),
        ),
      )
      .limit(1);
    if (!prop) return reply.code(404).send({ error: "Property not found" });

    return reply.send({
      tenant_id: tenant.tenantId,
      tenant_name: tenant.name,
      existing_tags: [],
      property: {
        property_id: prop.propertyId,
        tenant_id: prop.tenantId,
        property_type: prop.propertyType,
        name: prop.name,
        identifiers: prop.identifiers,
        tags: prop.tags ?? [],
        publisher_domain: prop.publisherDomain,
        verification_status: prop.verificationStatus,
        created_at: prop.createdAt?.toISOString() ?? null,
        updated_at: prop.updatedAt?.toISOString() ?? null,
      },
      mode: "edit",
      property_types: [...PROPERTY_TYPES],
    });
  });

  fastify.post("/tenant/:id/authorized-properties/:propertyId/edit", async (request, reply) => {
    const { id, propertyId } = request.params as { id: string; propertyId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;
    request.auditOperation = "edit_property";

    const body = (request.body ?? {}) as Record<string, unknown>;
    const propertyType = typeof body.property_type === "string" ? body.property_type.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const publisherDomain = typeof body.publisher_domain === "string" ? body.publisher_domain.trim() : "";

    if (!propertyType || !name || !publisherDomain) {
      return reply.code(400).send({ error: "property_type, name, and publisher_domain are required" });
    }
    if (!PROPERTY_TYPES.includes(propertyType as (typeof PROPERTY_TYPES)[number])) {
      return reply.code(400).send({ error: `Invalid property_type. Valid: ${PROPERTY_TYPES.join(", ")}` });
    }

    const identifiers = parseIdentifiers(body);
    if (identifiers.length === 0) {
      return reply.code(400).send({ error: "At least one identifier (type + value) is required" });
    }

    const tags = Array.isArray(body.tags)
      ? (body.tags as unknown[]).map((t) => String(t).trim()).filter(Boolean)
      : [];

    const [prop] = await db
      .select()
      .from(authorizedProperties)
      .where(
        and(
          eq(authorizedProperties.tenantId, id),
          eq(authorizedProperties.propertyId, propertyId),
        ),
      )
      .limit(1);
    if (!prop) return reply.code(404).send({ error: "Property not found" });

    await db
      .update(authorizedProperties)
      .set({
        propertyType,
        name,
        identifiers,
        tags: tags.length ? tags : null,
        publisherDomain,
        verificationStatus: "pending",
        verificationCheckedAt: null,
        verificationError: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(authorizedProperties.tenantId, id),
          eq(authorizedProperties.propertyId, propertyId),
        ),
      );

    return reply.send({
      success: true,
      message: `Property '${name}' updated successfully`,
    });
  });

  fastify.post("/tenant/:id/authorized-properties/:propertyId/delete", async (request, reply) => {
    const { id, propertyId } = request.params as { id: string; propertyId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;
    request.auditOperation = "delete_property";

    const [prop] = await db
      .select({ propertyId: authorizedProperties.propertyId, name: authorizedProperties.name })
      .from(authorizedProperties)
      .where(
        and(
          eq(authorizedProperties.tenantId, id),
          eq(authorizedProperties.propertyId, propertyId),
        ),
      )
      .limit(1);
    if (!prop) return reply.code(404).send({ error: "Property not found" });

    await db
      .delete(authorizedProperties)
      .where(
        and(
          eq(authorizedProperties.tenantId, id),
          eq(authorizedProperties.propertyId, propertyId),
        ),
      );

    return reply.send({
      success: true,
      message: `Property '${prop.name}' deleted`,
    });
  });
};

export default propertiesCrudRoute;
