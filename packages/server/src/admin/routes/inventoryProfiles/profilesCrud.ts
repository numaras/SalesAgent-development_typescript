import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { randomUUID } from "node:crypto";

import { db } from "../../../db/client.js";
import { inventoryProfiles } from "../../../db/schema/inventoryProfiles.js";
import { products } from "../../../db/schema/products.js";
import { tenants } from "../../../db/schema/tenants.js";
import { requireTenantAccess } from "../../services/authGuard.js";

const TAG_PATTERN = /^[a-z0-9_]{2,50}$/;

const defaultInventoryConfig = {
  ad_units: [] as string[],
  placements: [] as string[],
  include_descendants: true,
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 80) || "profile";
}

function getInventorySummary(inventoryConfig: { ad_units?: string[]; placements?: string[] } | null): string {
  if (!inventoryConfig) return "No inventory";
  const adUnits = inventoryConfig.ad_units?.length ?? 0;
  const placements = inventoryConfig.placements?.length ?? 0;
  const parts: string[] = [];
  if (adUnits) parts.push(`${adUnits} ad unit${adUnits !== 1 ? "s" : ""}`);
  if (placements) parts.push(`${placements} placement${placements !== 1 ? "s" : ""}`);
  return parts.length ? parts.join(", ") : "No inventory";
}

function getFormatSummary(formats: Array<{ id?: string }> | null): string {
  if (!formats?.length) return "No formats";
  const names = formats.slice(0, 5).map((f) => f.id ?? "Unknown");
  const summary = names.join(", ");
  return formats.length > 5 ? `${summary} (+${formats.length - 5} more)` : summary;
}

function getPropertySummary(publisherProperties: Array<{ publisher_domain?: string; property_ids?: string[]; property_tags?: string[] }> | null): string {
  if (!publisherProperties?.length) return "No properties";
  const domains = new Set(publisherProperties.map((p) => p.publisher_domain).filter(Boolean));
  let propertyCount = 0;
  let tagCount = 0;
  for (const p of publisherProperties) {
    propertyCount += p.property_ids?.length ?? 0;
    tagCount += p.property_tags?.length ?? 0;
  }
  const parts = [`${domains.size} domain${domains.size !== 1 ? "s" : ""}`];
  if (propertyCount) parts.push(`${propertyCount} propert${propertyCount !== 1 ? "ies" : "y"}`);
  if (tagCount) parts.push(`${tagCount} tag${tagCount !== 1 ? "s" : ""}`);
  return parts.join(", ");
}

const profilesCrudRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/tenant/:id/inventory-profiles", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const [tenant] = await db
      .select({ tenantId: tenants.tenantId, name: tenants.name })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const rows = await db
      .select({
        id: inventoryProfiles.id,
        profileId: inventoryProfiles.profileId,
        name: inventoryProfiles.name,
        description: inventoryProfiles.description,
        inventoryConfig: inventoryProfiles.inventoryConfig,
        formatIds: inventoryProfiles.formatIds,
        publisherProperties: inventoryProfiles.publisherProperties,
        createdAt: inventoryProfiles.createdAt,
        updatedAt: inventoryProfiles.updatedAt,
        productCount: sql<number>`count(${products.productId})::int`,
      })
      .from(inventoryProfiles)
      .leftJoin(products, eq(products.inventoryProfileId, inventoryProfiles.id))
      .where(eq(inventoryProfiles.tenantId, id))
      .groupBy(inventoryProfiles.id)
      .orderBy(inventoryProfiles.name);

    const profiles = rows.map((r) => ({
      id: r.id,
      profile_id: r.profileId,
      name: r.name,
      description: r.description,
      inventory_summary: getInventorySummary(r.inventoryConfig),
      format_summary: getFormatSummary(r.formatIds ?? []),
      property_summary: getPropertySummary(r.publisherProperties ?? []),
      product_count: Number(r.productCount ?? 0),
      created_at: r.createdAt?.toISOString() ?? null,
      updated_at: r.updatedAt?.toISOString() ?? null,
    }));

    return reply.send({
      tenant_id: tenant.tenantId,
      tenant_name: tenant.name,
      profiles,
    });
  });

  fastify.get("/tenant/:id/inventory-profiles/add", async (request, reply) => {
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
      profile: null,
      mode: "create",
    });
  });

  fastify.post("/tenant/:id/inventory-profiles/add", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const body = (request.body ?? {}) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return reply.code(400).send({ error: "name is required" });

    const profileId =
      (typeof body.profile_id === "string" ? body.profile_id.trim() : null) || slugify(name) + "_" + randomUUID().slice(0, 8);
    const description = typeof body.description === "string" ? body.description.trim() : null;

    const inventoryConfig = (body.inventory_config as Record<string, unknown>) ?? defaultInventoryConfig;
    const adUnits = Array.isArray(inventoryConfig.ad_units) ? inventoryConfig.ad_units : (inventoryConfig.ad_units as string)?.split(",").map((s: string) => s.trim()).filter(Boolean) ?? [];
    const placements = Array.isArray(inventoryConfig.placements) ? inventoryConfig.placements : (inventoryConfig.placements as string)?.split(",").map((s: string) => s.trim()).filter(Boolean) ?? [];
    const formatIds = Array.isArray(body.format_ids) ? (body.format_ids as Array<{ agent_url: string; id: string }>) : [];

    if (!formatIds.length) {
      return reply.code(400).send({ error: "At least one creative format is required" });
    }

    const propertyMode = typeof body.property_mode === "string" ? body.property_mode : "full";
    let publisherProperties: Array<{ publisher_domain: string; property_ids?: string[]; property_tags?: string[]; selection_type?: string }> = [];

    const [tenant] = await db.select({ tenantId: tenants.tenantId, subdomain: tenants.subdomain }).from(tenants).where(eq(tenants.tenantId, id)).limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const publisherDomain = typeof body.publisher_domain === "string" && body.publisher_domain.trim()
      ? body.publisher_domain.trim()
      : tenant.subdomain ?? "unknown";

    if (propertyMode === "tags") {
      const rawTags = typeof body.property_tags === "string" ? body.property_tags : "";
      const tagList = rawTags.split(",").map((t: string) => t.trim().toLowerCase()).filter(Boolean);
      if (!tagList.length) {
        return reply.code(400).send({ error: "Property tags are required" });
      }
      for (const tag of tagList) {
        if (!TAG_PATTERN.test(tag)) {
          return reply.code(400).send({ error: `Invalid tag format: '${tag}'. Use lowercase letters, numbers, underscores (2-50 chars)` });
        }
      }
      publisherProperties = [{ publisher_domain: publisherDomain, property_tags: tagList, selection_type: "by_tag" }];
    } else {
      const rawProps = Array.isArray(body.publisher_properties) ? (body.publisher_properties as Array<{ publisher_domain: string; property_ids?: string[]; property_tags?: string[] }>) : [];
      if (!rawProps.length) {
        return reply.code(400).send({ error: "Publisher properties are required" });
      }
      publisherProperties = rawProps;
    }

    const [existing] = await db
      .select({ id: inventoryProfiles.id })
      .from(inventoryProfiles)
      .where(and(eq(inventoryProfiles.tenantId, id), eq(inventoryProfiles.profileId, profileId)))
      .limit(1);
    if (existing) return reply.code(400).send({ error: `Profile ID '${profileId}' already exists` });

    request.auditOperation = "create_inventory_profile";

    const [inserted] = await db
      .insert(inventoryProfiles)
      .values({
        tenantId: id,
        profileId,
        name,
        description: description ?? null,
        inventoryConfig: { ad_units: adUnits, placements, include_descendants: Boolean(inventoryConfig.include_descendants ?? true) },
        formatIds: formatIds,
        publisherProperties: publisherProperties,
        targetingTemplate: (body.targeting_template as Record<string, unknown>) ?? null,
      })
      .returning({ id: inventoryProfiles.id, profileId: inventoryProfiles.profileId, name: inventoryProfiles.name });

    return reply.send({
      success: true,
      id: inserted?.id,
      profile_id: inserted?.profileId,
      name: inserted?.name,
      message: `Inventory profile '${name}' created successfully`,
    });
  });

  fastify.get("/tenant/:id/inventory-profiles/:profileId/edit", async (request, reply) => {
    const { id, profileId } = request.params as { id: string; profileId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const numericId = parseInt(profileId, 10);
    if (Number.isNaN(numericId)) return reply.code(400).send({ error: "Invalid profile id" });

    const [tenant] = await db.select({ tenantId: tenants.tenantId, name: tenants.name }).from(tenants).where(eq(tenants.tenantId, id)).limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const [profile] = await db
      .select()
      .from(inventoryProfiles)
      .where(and(eq(inventoryProfiles.tenantId, id), eq(inventoryProfiles.id, numericId)))
      .limit(1);
    if (!profile) return reply.code(404).send({ error: "Inventory profile not found" });

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(eq(products.inventoryProfileId, numericId));
    const productCount = Number(countRow?.count ?? 0);

    return reply.send({
      tenant_id: tenant.tenantId,
      tenant_name: tenant.name,
      profile: {
        id: profile.id,
        profile_id: profile.profileId,
        name: profile.name,
        description: profile.description,
        inventory_config: profile.inventoryConfig,
        format_ids: profile.formatIds,
        publisher_properties: profile.publisherProperties,
        targeting_template: profile.targetingTemplate,
        created_at: profile.createdAt?.toISOString() ?? null,
        updated_at: profile.updatedAt?.toISOString() ?? null,
      },
      product_count: productCount,
      product_count_warning: productCount > 0
        ? `Profile is used by ${productCount} product(s). Changes will affect future media buys`
        : null,
      mode: "edit",
    });
  });

  fastify.post("/tenant/:id/inventory-profiles/:profileId/edit", async (request, reply) => {
    const { id, profileId } = request.params as { id: string; profileId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const numericId = parseInt(profileId, 10);
    if (Number.isNaN(numericId)) return reply.code(400).send({ error: "Invalid profile id" });

    const body = (request.body ?? {}) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : null;

    const [profile] = await db
      .select()
      .from(inventoryProfiles)
      .where(and(eq(inventoryProfiles.tenantId, id), eq(inventoryProfiles.id, numericId)))
      .limit(1);
    if (!profile) return reply.code(404).send({ error: "Inventory profile not found" });

    const inventoryConfig = (body.inventory_config as Record<string, unknown>) ?? profile.inventoryConfig ?? defaultInventoryConfig;
    const adUnits = Array.isArray(inventoryConfig.ad_units) ? inventoryConfig.ad_units : [];
    const placements = Array.isArray(inventoryConfig.placements) ? inventoryConfig.placements : [];
    const formatIds = Array.isArray(body.format_ids) ? (body.format_ids as Array<{ agent_url: string; id: string }>) : profile.formatIds ?? [];
    const publisherProperties = Array.isArray(body.publisher_properties) ? (body.publisher_properties as Array<{ publisher_domain: string; property_ids?: string[]; property_tags?: string[] }>) : profile.publisherProperties ?? [];

    request.auditOperation = "update_inventory_profile";

    await db
      .update(inventoryProfiles)
      .set({
        name: name || profile.name,
        description: description ?? profile.description,
        inventoryConfig: { ad_units: adUnits, placements, include_descendants: Boolean(inventoryConfig.include_descendants ?? true) },
        formatIds: formatIds.length ? formatIds : profile.formatIds,
        publisherProperties: publisherProperties.length ? publisherProperties : profile.publisherProperties,
        targetingTemplate: (body.targeting_template as Record<string, unknown>) ?? profile.targetingTemplate,
        updatedAt: new Date(),
      })
      .where(and(eq(inventoryProfiles.tenantId, id), eq(inventoryProfiles.id, numericId)));

    return reply.send({
      success: true,
      id: numericId,
      message: `Inventory profile updated successfully`,
    });
  });

  fastify.delete("/tenant/:id/inventory-profiles/:profileId/delete", async (request, reply) => {
    const { id, profileId } = request.params as { id: string; profileId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const numericId = parseInt(profileId, 10);
    if (Number.isNaN(numericId)) return reply.code(400).send({ error: "Invalid profile id" });

    const [profile] = await db
      .select({ id: inventoryProfiles.id, name: inventoryProfiles.name })
      .from(inventoryProfiles)
      .where(and(eq(inventoryProfiles.tenantId, id), eq(inventoryProfiles.id, numericId)))
      .limit(1);
    if (!profile) return reply.code(404).send({ error: "Inventory profile not found" });

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(eq(products.inventoryProfileId, numericId));
    const productCount = Number(countRow?.count ?? 0);
    if (productCount > 0) {
      return reply.code(400).send({
        error: `Cannot delete inventory profile - used by ${productCount} product(s)`,
      });
    }

    request.auditOperation = "delete_inventory_profile";

    await db
      .delete(inventoryProfiles)
      .where(and(eq(inventoryProfiles.tenantId, id), eq(inventoryProfiles.id, numericId)));

    return reply.send({
      success: true,
      message: `Inventory profile '${profile.name}' deleted`,
    });
  });

  fastify.post("/tenant/:id/inventory-profiles/:profileId/delete", async (request, reply) => {
    const { id, profileId } = request.params as { id: string; profileId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const numericId = parseInt(profileId, 10);
    if (Number.isNaN(numericId)) return reply.code(400).send({ error: "Invalid profile id" });

    const [profile] = await db
      .select({ id: inventoryProfiles.id, name: inventoryProfiles.name })
      .from(inventoryProfiles)
      .where(and(eq(inventoryProfiles.tenantId, id), eq(inventoryProfiles.id, numericId)))
      .limit(1);
    if (!profile) return reply.code(404).send({ error: "Inventory profile not found" });

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(eq(products.inventoryProfileId, numericId));
    const productCount = Number(countRow?.count ?? 0);
    if (productCount > 0) {
      return reply.code(400).send({
        error: `Cannot delete inventory profile - used by ${productCount} product(s)`,
      });
    }

    request.auditOperation = "delete_inventory_profile";

    await db
      .delete(inventoryProfiles)
      .where(and(eq(inventoryProfiles.tenantId, id), eq(inventoryProfiles.id, numericId)));

    return reply.send({
      success: true,
      message: `Inventory profile '${profile.name}' deleted`,
    });
  });
};

export default profilesCrudRoute;
