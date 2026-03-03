import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { auditLogs } from "../../../db/schema/auditLogs.js";
import { inventoryProfiles } from "../../../db/schema/inventoryProfiles.js";
import { products } from "../../../db/schema/products.js";
import { tenants } from "../../../db/schema/tenants.js";
import { listFormats } from "../../../services/formatService.js";
import { requireTenantAccess } from "../../services/authGuard.js";
import { getAdminSession } from "../../services/sessionService.js";

const DEFAULT_CREATIVE_AGENT_URL = "https://creative.adcontextprotocol.org";

function normalizeAgentUrl(url: string): string {
  const trimmed = url.trim();
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter((entry) => entry.length > 0);
  }
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function parsePricingOptions(body: Record<string, unknown>): Record<string, unknown>[] {
  const raw = body.pricing_options;
  if (Array.isArray(raw)) return raw.filter((entry) => entry && typeof entry === "object");
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((entry) => entry && typeof entry === "object") : [];
    } catch {
      return [];
    }
  }
  return [];
}

const editProductRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/tenant/:id/products/:productId/edit", async (request, reply) => {
    const { id, productId } = request.params as { id: string; productId: string };

    if (!(await requireTenantAccess(request, reply, id))) return;

    const [tenant] = await db
      .select({ tenantId: tenants.tenantId, name: tenants.name })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.tenantId, id), eq(products.productId, productId)))
      .limit(1);
    if (!product) return reply.code(404).send({ error: "Product not found" });

    return reply.send({
      tenant_id: id,
      tenant_name: tenant.name,
      product: {
        product_id: product.productId,
        name: product.name,
        description: product.description,
        formats: product.formatIds ?? [],
        countries: product.countries ?? [],
        channels: product.channels ?? [],
        targeting_template: product.targetingTemplate ?? {},
        implementation_config: product.implementationConfig ?? {},
        delivery_measurement: product.deliveryMeasurement ?? null,
        product_card: product.productCard ?? null,
        is_dynamic: product.isDynamic,
        signals_agent_ids: product.signalsAgentIds ?? null,
        variant_name_template: product.variantNameTemplate ?? null,
        max_signals: product.maxSignals,
        variant_ttl_days: product.variantTtlDays ?? null,
        allowed_principal_ids: product.allowedPrincipalIds ?? [],
        inventory_profile_id: product.inventoryProfileId ?? null,
        properties: product.properties ?? null,
        property_ids: product.propertyIds ?? null,
        property_tags: product.propertyTags ?? null,
      },
    });
  });

  fastify.post("/tenant/:id/products/:productId/edit", async (request, reply) => {
    const { id, productId } = request.params as { id: string; productId: string };

    if (!(await requireTenantAccess(request, reply, id))) return;

    const session = getAdminSession(request);

    const [existing] = await db
      .select()
      .from(products)
      .where(and(eq(products.tenantId, id), eq(products.productId, productId)))
      .limit(1);
    if (!existing) return reply.code(404).send({ error: "Product not found" });

    const body = (request.body ?? {}) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return reply.code(400).send({ error: "Product name is required" });

    // Parse formats; preserve optional parameterized dimension/duration fields
    const formatRefs = parseJsonArray(body.formats).map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const rec = entry as Record<string, unknown>;
      const formatId =
        (typeof rec.id === "string" && rec.id.trim()) ||
        (typeof rec.format_id === "string" && rec.format_id.trim()) ||
        "";
      const agentUrl = typeof rec.agent_url === "string" ? rec.agent_url.trim() : "";
      if (!formatId || !agentUrl) return null;
      const fmt: Record<string, unknown> = { agent_url: agentUrl, id: formatId };
      if (typeof rec.width === "number") fmt.width = Math.round(rec.width);
      if (typeof rec.height === "number") fmt.height = Math.round(rec.height);
      if (typeof rec.duration_ms === "number") fmt.duration_ms = rec.duration_ms;
      return fmt;
    }).filter((entry): entry is Record<string, unknown> & { agent_url: string; id: string } => Boolean(entry));

    if (formatRefs.length === 0) {
      return reply.code(400).send({ error: "At least one format is required" });
    }

    // Validate default-agent format IDs when format lookup is available.
    // Graceful fallback: if lookup fails, keep submitted formats (Python parity behavior).
    try {
      const available = await listFormats({ tenantId: id }, {});
      const validDefaultAgentIds = new Set(
        (available.formats ?? [])
          .filter((f) => normalizeAgentUrl(f.format_id.agent_url) === DEFAULT_CREATIVE_AGENT_URL)
          .map((f) => f.format_id.id),
      );
      if (validDefaultAgentIds.size > 0) {
        const invalidDefaultFormats = formatRefs
          .filter(
            (f) =>
              normalizeAgentUrl(f.agent_url) === DEFAULT_CREATIVE_AGENT_URL &&
              !validDefaultAgentIds.has(f.id),
          )
          .map((f) => f.id);
        if (invalidDefaultFormats.length > 0) {
          return reply.code(400).send({
            error: `Invalid format IDs: ${invalidDefaultFormats.join(", ")}`,
          });
        }
      }
    } catch {
      // Keep graceful-degradation behavior when format lookup is unavailable.
    }

    const pricingOptions = parsePricingOptions(body);
    const firstPricing = pricingOptions[0] as Record<string, unknown> | undefined;
    const isFixed =
      typeof firstPricing?.is_fixed === "boolean" ? firstPricing.is_fixed : true;
    const deliveryType = isFixed ? "guaranteed" : "non_guaranteed";

    const countries = parseStringArray(body.countries);
    const channels = parseStringArray(body.channels);

    // inventory_profile_id — SECURITY: verify profile belongs to this tenant (Python L1480-1503)
    let inventoryProfileId: number | null = existing.inventoryProfileId ?? null;
    const rawProfileId = body.inventory_profile_id;
    if (rawProfileId !== undefined) {
      if (rawProfileId === null || rawProfileId === "" || rawProfileId === "0") {
        inventoryProfileId = null;
      } else {
        const profileIdNum =
          typeof rawProfileId === "number"
            ? Math.round(rawProfileId)
            : parseInt(String(rawProfileId), 10);
        if (isNaN(profileIdNum)) {
          return reply.code(400).send({ error: "Invalid inventory profile ID" });
        }
        const [profileRow] = await db
          .select({ id: inventoryProfiles.id, tenantId: inventoryProfiles.tenantId })
          .from(inventoryProfiles)
          .where(eq(inventoryProfiles.id, profileIdNum))
          .limit(1);
        if (!profileRow || profileRow.tenantId !== id) {
          return reply.code(400).send({
            error: "Invalid inventory profile - profile not found or does not belong to this tenant",
          });
        }
        inventoryProfileId = profileIdNum;
      }
    }

    // allowed_principal_ids — visibility restriction (Python L990-993)
    const allowedPrincipalIds: string[] | null = (() => {
      const raw = body.allowed_principal_ids;
      if (!raw) return null;
      const arr = Array.isArray(raw) ? raw : parseStringArray(raw);
      return arr.length > 0 ? arr : null;
    })();

    // delivery_measurement — provider + optional notes (Python L996-1004)
    const deliveryMeasurement: Record<string, unknown> | null = (() => {
      const provider =
        typeof body.delivery_measurement_provider === "string"
          ? body.delivery_measurement_provider.trim()
          : "";
      if (!provider) return existing.deliveryMeasurement ?? null;
      const dm: Record<string, unknown> = { provider };
      const notes =
        typeof body.delivery_measurement_notes === "string"
          ? body.delivery_measurement_notes.trim()
          : "";
      if (notes) dm.notes = notes;
      return dm;
    })();

    // product_card — auto-generated from product_image_url (Python L1006-1034)
    const productCard: Record<string, unknown> | null = (() => {
      const imageUrl =
        typeof body.product_image_url === "string" ? body.product_image_url.trim() : "";
      if (!imageUrl) return existing.productCard ?? null;
      const manifest: Record<string, unknown> = {
        product_image: imageUrl,
        product_name: name,
        product_description: typeof body.description === "string" ? body.description.trim() : "",
        delivery_type: deliveryType,
      };
      if (firstPricing) {
        manifest.pricing_model = firstPricing.pricing_model ?? "CPM";
        if (firstPricing.is_fixed && firstPricing.fixed_price) {
          manifest.pricing_amount = String(firstPricing.fixed_price);
          manifest.pricing_currency = firstPricing.currency_code ?? "USD";
        }
      }
      return {
        format_id: {
          agent_url: "https://creative.adcontextprotocol.org/",
          id: "product_card_standard",
        },
        manifest,
      };
    })();

    // properties / property_ids / property_tags (Python L1036-1195)
    // Accepts publisher_properties discriminated union objects directly from API callers;
    // falls back to existing values when the fields are not present in the request body.
    const updatedProperties =
      "properties" in body
        ? (Array.isArray(body.properties) ? body.properties as Record<string, unknown>[] : null)
        : existing.properties ?? null;
    const updatedPropertyIds =
      "property_ids" in body
        ? parseStringArray(body.property_ids) ?? null
        : existing.propertyIds ?? null;
    const updatedPropertyTags =
      "property_tags" in body
        ? parseStringArray(body.property_tags) ?? null
        : existing.propertyTags ?? null;

    // Dynamic product fields (Python L1197-1247)
    const isDynamic =
      typeof body.is_dynamic === "boolean"
        ? body.is_dynamic
        : body.is_dynamic === "true" || body.is_dynamic === "on" || body.is_dynamic === "1"
          ? true
          : body.is_dynamic === false || body.is_dynamic === "false"
            ? false
            : existing.isDynamic;

    const signalsAgentIds: string[] | null = (() => {
      if (!isDynamic) return null;
      const raw = body.signals_agent_ids;
      if (raw === undefined) return existing.signalsAgentIds ?? null;
      if (raw === null) return null;
      const arr = Array.isArray(raw) ? raw : parseStringArray(raw);
      return arr.length > 0 ? arr : null;
    })();

    const variantNameTemplate: string | null = (() => {
      if (!isDynamic) return existing.variantNameTemplate ?? null;
      if (typeof body.variant_name_template === "string") {
        return body.variant_name_template.trim() || null;
      }
      return existing.variantNameTemplate ?? null;
    })();

    const maxSignals: number = (() => {
      if (!isDynamic) return existing.maxSignals;
      const raw = body.max_signals;
      const n = typeof raw === "number" ? raw : parseInt(String(raw ?? ""), 10);
      return isNaN(n) ? 5 : n;
    })();

    const variantTtlDays: number | null = (() => {
      if (!isDynamic) return existing.variantTtlDays ?? null;
      const raw = body.variant_ttl_days;
      if (raw === undefined || raw === null || raw === "") return existing.variantTtlDays ?? null;
      const n = typeof raw === "number" ? Math.round(raw) : parseInt(String(raw), 10);
      return isNaN(n) ? null : n;
    })();

    await db
      .update(products)
      .set({
        name,
        description: typeof body.description === "string" ? body.description.trim() : null,
        formatIds: formatRefs.length > 0
          ? (formatRefs as unknown as Array<{ agent_url: string; id: string }>)
          : existing.formatIds,
        targetingTemplate: (() => {
          try {
            const raw = typeof body.targeting_template === "string" ? body.targeting_template : "";
            if (!raw.trim()) return existing.targetingTemplate ?? {};
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === "object" ? parsed : existing.targetingTemplate ?? {};
          } catch {
            return existing.targetingTemplate ?? {};
          }
        })(),
        deliveryType,
        implementationConfig: {
          ...(existing.implementationConfig ?? {}),
          pricing_options: pricingOptions.length > 0
            ? pricingOptions
            : ((existing.implementationConfig ?? {})["pricing_options"] ?? []),
        },
        countries: countries.length > 0 ? countries : null,
        channels: channels.length > 0 ? channels : null,
        inventoryProfileId,
        allowedPrincipalIds: allowedPrincipalIds ?? existing.allowedPrincipalIds ?? null,
        deliveryMeasurement,
        productCard,
        properties: updatedProperties,
        propertyIds: updatedPropertyIds && updatedPropertyIds.length > 0 ? updatedPropertyIds : null,
        propertyTags: updatedPropertyTags && updatedPropertyTags.length >= 0 ? updatedPropertyTags : null,
        isDynamic,
        signalsAgentIds,
        variantNameTemplate,
        maxSignals,
        variantTtlDays,
      })
      .where(and(eq(products.tenantId, id), eq(products.productId, productId)));

    const actor = typeof session.user === "string" ? session.user : "unknown";
    try {
      await db.insert(auditLogs).values({
        tenantId: id,
        operation: "edit_product",
        principalName: actor,
        adapterId: "admin_ui",
        success: true,
        details: { event_type: "edit_product", product_id: productId, product_name: name },
      });
    } catch { /* audit failure must not block response */ }

    return reply.send({
      success: true,
      product_id: productId,
      message: `Product '${name}' updated`,
    });
  });
};

export default editProductRoute;
