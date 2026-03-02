import { asc, eq, inArray } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { inventoryProfiles } from "../../../db/schema/inventoryProfiles.js";
import { productInventoryMappings } from "../../../db/schema/productInventoryMappings.js";
import { products } from "../../../db/schema/products.js";
import { tenants } from "../../../db/schema/tenants.js";
import { requireTenantAccess } from "../../services/authGuard.js";

function asArray<T>(value: unknown, fallback: T[] = []): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function resolveFormats(raw: unknown): Array<{ format_id: string; name: string }> {
  const formats = asArray<Record<string, unknown> | string>(raw, []);
  const resolved: Array<{ format_id: string; name: string }> = [];
  for (const fmt of formats) {
    if (typeof fmt === "string" && fmt.trim()) {
      resolved.push({ format_id: fmt.trim(), name: fmt.trim() });
      continue;
    }
    if (!fmt || typeof fmt !== "object") continue;
    const record = fmt as Record<string, unknown>;
    const formatId =
      (typeof record.id === "string" && record.id.trim()) ||
      (typeof record.format_id === "string" && record.format_id.trim()) ||
      "";
    if (formatId) {
      resolved.push({ format_id: formatId, name: formatId });
    }
  }
  return resolved;
}

const listProductsRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/tenant/:id/products", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const [tenant] = await db
      .select({
        tenant_id: tenants.tenantId,
        name: tenants.name,
      })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const productRows = await db
      .select()
      .from(products)
      .where(eq(products.tenantId, id))
      .orderBy(asc(products.name));

    // Fetch all inventory mappings for this tenant in one query, group by productId
    const allMappings = await db
      .select({
        productId: productInventoryMappings.productId,
        inventoryType: productInventoryMappings.inventoryType,
      })
      .from(productInventoryMappings)
      .where(eq(productInventoryMappings.tenantId, id));

    const mappingsByProduct = new Map<
      string,
      { ad_units: number; placements: number; custom_keys: number }
    >();
    for (const m of allMappings) {
      if (!mappingsByProduct.has(m.productId)) {
        mappingsByProduct.set(m.productId, { ad_units: 0, placements: 0, custom_keys: 0 });
      }
      const counts = mappingsByProduct.get(m.productId)!;
      if (m.inventoryType === "ad_unit") counts.ad_units++;
      else if (m.inventoryType === "placement") counts.placements++;
      else if (m.inventoryType === "custom_key") counts.custom_keys++;
    }

    // Fetch inventory profiles for products that reference one
    const profileIds = [
      ...new Set(
        productRows
          .filter((p) => p.inventoryProfileId != null)
          .map((p) => p.inventoryProfileId as number),
      ),
    ];
    const profileRows =
      profileIds.length > 0
        ? await db
            .select()
            .from(inventoryProfiles)
            .where(inArray(inventoryProfiles.id, profileIds))
        : [];
    const profilesById = new Map(profileRows.map((p) => [p.id, p]));

    const productList = productRows.map((product) => {
      const counts = mappingsByProduct.get(product.productId) ?? {
        ad_units: 0,
        placements: 0,
        custom_keys: 0,
      };
      const total = counts.ad_units + counts.placements + counts.custom_keys;

      let inventoryProfile: Record<string, unknown> | null = null;
      if (product.inventoryProfileId != null) {
        const profile = profilesById.get(product.inventoryProfileId);
        if (profile) {
          const cfg = profile.inventoryConfig ?? {};
          inventoryProfile = {
            id: profile.id,
            profile_id: profile.profileId,
            name: profile.name,
            description: profile.description ?? null,
            inventory_summary: {
              ad_units: Array.isArray(cfg.ad_units) ? cfg.ad_units : [],
              placements: Array.isArray(cfg.placements) ? cfg.placements : [],
            },
          };
        }
      }

      return {
        product_id: product.productId,
        name: product.name,
        description: product.description,
        pricing_options: asArray(product.priceGuidance?.["pricing_options"], []),
        formats: resolveFormats(product.formatIds),
        countries: asArray<string>(product.countries, []),
        implementation_config: asObject(product.implementationConfig),
        // created_at is not in the Drizzle products schema; field preserved for API parity
        created_at: null,
        inventory_details: {
          total,
          ad_units: counts.ad_units,
          placements: counts.placements,
          custom_keys: counts.custom_keys,
        },
        inventory_profile: inventoryProfile,
        is_dynamic: Boolean(product.isDynamic),
        is_dynamic_variant: Boolean(product.isDynamicVariant),
        activation_key: product.activationKey ?? null,
        product_card: product.productCard ?? null,
      };
    });

    return reply.send({
      tenant,
      tenant_id: id,
      products: productList,
    });
  });
};

export default listProductsRoute;
