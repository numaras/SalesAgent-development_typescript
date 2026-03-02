import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { inventoryProfiles } from "../../../db/schema/inventoryProfiles.js";
import { products } from "../../../db/schema/products.js";
import { tenants } from "../../../db/schema/tenants.js";
import { requireTenantAccess } from "../../services/authGuard.js";

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

const profilesApiRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/tenant/:id/inventory-profiles/:profileId/api", async (request, reply) => {
    const { id, profileId } = request.params as { id: string; profileId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const numericId = parseInt(profileId, 10);
    if (Number.isNaN(numericId)) return reply.code(400).send({ error: "Invalid profile id" });

    const [profile] = await db
      .select()
      .from(inventoryProfiles)
      .where(and(eq(inventoryProfiles.tenantId, id), eq(inventoryProfiles.id, numericId)))
      .limit(1);
    if (!profile) return reply.code(404).send({ error: "Inventory profile not found" });

    const inv = profile.inventoryConfig ?? {};
    const adUnits = inv.ad_units ?? [];
    const placements = inv.placements ?? [];

    return reply.send({
      id: profile.id,
      profile_id: profile.profileId,
      name: profile.name,
      description: profile.description,
      inventory_config: profile.inventoryConfig,
      targeted_ad_unit_ids: Array.isArray(adUnits) ? adUnits.join(",") : "",
      targeted_placement_ids: Array.isArray(placements) ? placements.join(",") : "",
      include_descendants: inv.include_descendants ?? true,
      formats: profile.formatIds,
      publisher_properties: profile.publisherProperties,
      property_mode: "all",
      targeting_template: profile.targetingTemplate,
    });
  });

  fastify.get("/tenant/:id/inventory-profiles/:profileId/preview", async (request, reply) => {
    const { id, profileId } = request.params as { id: string; profileId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const numericId = parseInt(profileId, 10);
    if (Number.isNaN(numericId)) return reply.code(400).send({ error: "Invalid profile id" });

    const [profile] = await db
      .select()
      .from(inventoryProfiles)
      .where(and(eq(inventoryProfiles.tenantId, id), eq(inventoryProfiles.id, numericId)))
      .limit(1);
    if (!profile) return reply.code(404).send({ error: "Inventory profile not found" });

    const inv = profile.inventoryConfig ?? {};
    const adUnits = inv.ad_units ?? [];
    const placements = inv.placements ?? [];

    return reply.send({
      id: profile.id,
      profile_id: profile.profileId,
      name: profile.name,
      description: profile.description,
      ad_unit_count: Array.isArray(adUnits) ? adUnits.length : 0,
      placement_count: Array.isArray(placements) ? placements.length : 0,
      format_count: profile.formatIds?.length ?? 0,
      format_summary: getFormatSummary(profile.formatIds ?? []),
      property_summary: getPropertySummary(profile.publisherProperties ?? []),
    });
  });

  fastify.get("/tenant/:id/inventory-profiles/api/list", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const [tenant] = await db.select({ tenantId: tenants.tenantId }).from(tenants).where(eq(tenants.tenantId, id)).limit(1);
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

    return reply.send({ profiles, total: profiles.length });
  });
};

export default profilesApiRoute;
