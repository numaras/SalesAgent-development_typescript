import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { capabilitiesRouteSchema } from "../../../routes/schemas/admin/adapters/capabilities.schema.js";
import { requireTenantAccess } from "../../services/authGuard.js";
import { getAdminSession } from "../../services/sessionService.js";

type AdapterCapabilities = {
  supports_inventory_sync: boolean;
  supports_inventory_profiles: boolean;
  inventory_entity_label: string;
  supports_custom_targeting: boolean;
  supports_geo_targeting: boolean;
  supports_dynamic_products: boolean;
  supported_pricing_models: string[] | null;
  supports_webhooks: boolean;
  supports_realtime_reporting: boolean;
};

const DEFAULT_CAPABILITIES: AdapterCapabilities = {
  supports_inventory_sync: false,
  supports_inventory_profiles: false,
  inventory_entity_label: "Items",
  supports_custom_targeting: false,
  supports_geo_targeting: true,
  supports_dynamic_products: false,
  supported_pricing_models: null,
  supports_webhooks: false,
  supports_realtime_reporting: false,
};

const KNOWN_ADAPTERS: Record<string, AdapterCapabilities> = {
  mock: {
    supports_inventory_sync: false,
    supports_inventory_profiles: false,
    inventory_entity_label: "Mock Items",
    supports_custom_targeting: false,
    supports_geo_targeting: true,
    supports_dynamic_products: false,
    supported_pricing_models: ["cpm", "vcpm", "cpcv", "cpp", "cpc", "cpv", "flat_rate"],
    supports_webhooks: false,
    supports_realtime_reporting: false,
  },
  google_ad_manager: { ...DEFAULT_CAPABILITIES },
  gam: { ...DEFAULT_CAPABILITIES },
  kevel: { ...DEFAULT_CAPABILITIES },
  triton: { ...DEFAULT_CAPABILITIES },
  triton_digital: { ...DEFAULT_CAPABILITIES },
  broadstreet: {
    supports_inventory_sync: true,
    supports_inventory_profiles: true,
    inventory_entity_label: "Zones",
    supports_custom_targeting: false,
    supports_geo_targeting: true,
    supports_dynamic_products: false,
    supported_pricing_models: ["cpm", "flat_rate"],
    supports_webhooks: false,
    supports_realtime_reporting: true,
  },
};

const capabilitiesRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/api/adapters/:type/capabilities", { schema: capabilitiesRouteSchema }, async (request, reply) => {
    const session = getAdminSession(request);
    const tenantId = typeof session.tenant_id === "string" ? session.tenant_id : null;

    if (tenantId) {
      if (!(await requireTenantAccess(request, reply, tenantId))) return;
    } else {
      if (!session.user) return reply.code(401).send({ error: "Authentication required" });
    }

    const { type } = request.params as { type: string };
    const adapterType = type?.trim().toLowerCase() ?? "";

    const capabilities = KNOWN_ADAPTERS[adapterType];
    if (!capabilities) {
      return reply.code(404).send({ error: `Unknown adapter type: ${adapterType}` });
    }

    return reply.send(capabilities);
  });
};

export default capabilitiesRoute;
