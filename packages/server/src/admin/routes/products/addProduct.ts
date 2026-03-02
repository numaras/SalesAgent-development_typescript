import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { randomUUID } from "node:crypto";

import { db } from "../../../db/client.js";
import { auditLogs } from "../../../db/schema/auditLogs.js";
import { currencyLimits } from "../../../db/schema/currencyLimits.js";
import { inventoryProfiles } from "../../../db/schema/inventoryProfiles.js";
import { products } from "../../../db/schema/products.js";
import { tenants } from "../../../db/schema/tenants.js";
import { requireTenantAccess } from "../../services/authGuard.js";
import { getAdminSession } from "../../services/sessionService.js";

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

// Mirrors Python GAMProductConfigService._generate_creative_placeholders()
function generateCreativePlaceholders(
  formatIds: string[],
): Array<Record<string, unknown>> {
  const formatDimensions: Record<string, [number, number]> = {
    display_300x250: [300, 250],
    display_728x90: [728, 90],
    display_160x600: [160, 600],
    display_300x600: [300, 600],
    display_970x250: [970, 250],
    display_320x50: [320, 50],
    display_320x100: [320, 100],
    display_300x50: [300, 50],
  };

  const placeholders: Array<Record<string, unknown>> = [];
  for (const formatId of formatIds) {
    const dims = formatDimensions[formatId];
    if (dims) {
      placeholders.push({ width: dims[0], height: dims[1], expected_creative_count: 1, is_native: false });
    } else if (formatId.startsWith("native_")) {
      placeholders.push({ width: 1, height: 1, expected_creative_count: 1, is_native: true });
    } else if (formatId.startsWith("video_")) {
      placeholders.push({ width: 640, height: 480, expected_creative_count: 1, is_native: false });
    }
  }

  if (placeholders.length === 0) {
    placeholders.push({ width: 300, height: 250, expected_creative_count: 1, is_native: false });
  }
  return placeholders;
}

// Mirrors Python GAMProductConfigService.generate_default_config()
function generateGamDefaultConfig(
  deliveryType: string,
  formatRefs: Array<{ id: string; agent_url: string }>,
): Record<string, unknown> {
  const formatIds = formatRefs.map((f) => f.id);
  const base: Record<string, unknown> = {
    cost_type: "CPM",
    primary_goal_unit_type: "IMPRESSIONS",
    include_descendants: true,
    creative_placeholders: generateCreativePlaceholders(formatIds),
  };

  if (deliveryType === "guaranteed") {
    Object.assign(base, {
      line_item_type: "STANDARD",
      priority: 6,
      primary_goal_type: "DAILY",
      delivery_rate_type: "EVENLY",
      creative_rotation_type: "EVEN",
      non_guaranteed_automation: "manual",
    });
  } else {
    Object.assign(base, {
      line_item_type: "PRICE_PRIORITY",
      priority: 10,
      primary_goal_type: "NONE",
      delivery_rate_type: "AS_FAST_AS_POSSIBLE",
      creative_rotation_type: "OPTIMIZED",
      non_guaranteed_automation: "confirmation_required",
    });
  }

  return base;
}

const addProductRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/tenant/:id/products/add", async (request, reply) => {
    const { id } = request.params as { id: string };

    if (!(await requireTenantAccess(request, reply, id))) return;

    const [tenant] = await db
      .select({ tenantId: tenants.tenantId, name: tenants.name, adServer: tenants.adServer })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const limitRows = await db
      .select({ currency_code: currencyLimits.currencyCode })
      .from(currencyLimits)
      .where(eq(currencyLimits.tenantId, id));
    const currencies = limitRows.length > 0 ? limitRows.map((row) => row.currency_code) : ["USD"];

    const profileRows = await db
      .select({ id: inventoryProfiles.id, name: inventoryProfiles.name })
      .from(inventoryProfiles)
      .where(and(eq(inventoryProfiles.tenantId, id)))
      .orderBy(inventoryProfiles.name);

    return reply.send({
      tenant_id: id,
      tenant_name: tenant.name,
      adapter_type: tenant.adServer ?? "mock",
      currencies,
      inventory_profiles: profileRows.map((p) => ({ id: p.id, name: p.name })),
      inventory_synced: profileRows.length > 0,
    });
  });

  fastify.post("/tenant/:id/products/add", async (request, reply) => {
    const { id } = request.params as { id: string };

    if (!(await requireTenantAccess(request, reply, id))) return;

    const session = getAdminSession(request);

    const [tenant] = await db
      .select({ tenantId: tenants.tenantId, adServer: tenants.adServer })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const body = (request.body ?? {}) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return reply.code(400).send({ error: "Product name is required" });

    // Parse formats; include optional parameterized dimension/duration fields (AdCP parity)
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
      // Preserve optional dimension/duration fields for parameterized formats
      if (typeof rec.width === "number") fmt.width = Math.round(rec.width);
      if (typeof rec.height === "number") fmt.height = Math.round(rec.height);
      if (typeof rec.duration_ms === "number") fmt.duration_ms = rec.duration_ms;
      return fmt;
    }).filter((entry): entry is Record<string, unknown> & { agent_url: string; id: string } => Boolean(entry));

    // Format validation against creative agent registry follows graceful-degradation path:
    // TypeScript registry service not yet implemented; all submitted formats are accepted
    // (mirrors Python's ADCPConnectionError fallback path at products.py L766-793).

    const pricingOptions = parsePricingOptions(body);
    if (pricingOptions.length === 0) {
      return reply.code(400).send({ error: "Product must have at least one pricing option" });
    }

    const firstPricing = pricingOptions[0] as Record<string, unknown>;
    const isFixed = typeof firstPricing.is_fixed === "boolean" ? firstPricing.is_fixed : true;
    const deliveryType = isFixed ? "guaranteed" : "non_guaranteed";

    const countries = parseStringArray(body.countries);
    const channels = parseStringArray(body.channels);
    const productIdRaw = typeof body.product_id === "string" ? body.product_id.trim() : "";
    const productId = productIdRaw || `prod_${randomUUID().slice(0, 8)}`;

    const adapterType = tenant.adServer ?? "mock";

    // User-supplied adapter-specific fields (from UI product_config sub-component)
    const userImplConfig = body.implementation_config && typeof body.implementation_config === "object"
      ? (body.implementation_config as Record<string, unknown>)
      : {};

    // Build implementation_config: GAM adapter gets full default config; others get pricing only.
    // User-supplied fields are merged on top of generated defaults to allow UI overrides.
    let implementationConfig: Record<string, unknown>;
    if (adapterType === "google_ad_manager") {
      implementationConfig = {
        adapter_type: adapterType,
        pricing_options: pricingOptions,
        ...generateGamDefaultConfig(deliveryType, formatRefs),
        ...userImplConfig,
      };
    } else {
      implementationConfig = {
        adapter_type: adapterType,
        pricing_options: pricingOptions,
        ...userImplConfig,
      };
    }

    await db.insert(products).values({
      tenantId: id,
      productId,
      name,
      description: typeof body.description === "string" ? body.description.trim() : null,
      formatIds: formatRefs as unknown as Array<{ agent_url: string; id: string }>,
      deliveryType,
      targetingTemplate: (() => {
        try {
          const raw = typeof body.targeting_template === "string" ? body.targeting_template : "{}";
          const parsed = JSON.parse(raw);
          return parsed && typeof parsed === "object" ? parsed : {};
        } catch {
          return {};
        }
      })(),
      implementationConfig,
      countries: countries.length > 0 ? countries : null,
      channels: channels.length > 0 ? channels : null,
      isDynamic: false,
      isDynamicVariant: false,
    });

    const actor = typeof session.user === "string" ? session.user : "unknown";
    try {
      await db.insert(auditLogs).values({
        tenantId: id,
        operation: "add_product",
        principalName: actor,
        adapterId: "admin_ui",
        success: true,
        details: { event_type: "add_product", product_id: productId, product_name: name },
      });
    } catch { /* audit failure must not block response */ }

    return reply.code(201).send({
      success: true,
      product_id: productId,
      message: `Product '${name}' created`,
    });
  });
};

export default addProductRoute;
