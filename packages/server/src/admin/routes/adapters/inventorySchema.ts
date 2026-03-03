import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { inventorySchemaRouteSchema } from "../../../routes/schemas/admin/adapters/inventorySchema.schema.js";
import { requireTenantAccess } from "../../services/authGuard.js";

type InventorySchemaResponse = {
  adapter_name: string;
  supports_inventory_sync: boolean;
  supports_inventory_profiles: boolean;
  inventory_entity_label: string;
  entities: Array<{
    type: string;
    id_field: string;
    name_field: string;
    path_field?: string;
    metadata_field?: string;
  }>;
};

const DEFAULT_SCHEMA: InventorySchemaResponse = {
  adapter_name: "unknown",
  supports_inventory_sync: false,
  supports_inventory_profiles: false,
  inventory_entity_label: "Items",
  entities: [],
};

const ADAPTER_INVENTORY_SCHEMAS: Record<string, InventorySchemaResponse> = {
  google_ad_manager: {
    adapter_name: "google_ad_manager",
    supports_inventory_sync: true,
    supports_inventory_profiles: true,
    inventory_entity_label: "Inventory",
    entities: [
      {
        type: "ad_unit",
        id_field: "inventory_id",
        name_field: "name",
        path_field: "path",
        metadata_field: "inventory_metadata",
      },
      {
        type: "placement",
        id_field: "inventory_id",
        name_field: "name",
        path_field: "path",
        metadata_field: "inventory_metadata",
      },
      {
        type: "custom_targeting_key",
        id_field: "inventory_id",
        name_field: "name",
        metadata_field: "inventory_metadata",
      },
      {
        type: "audience_segment",
        id_field: "inventory_id",
        name_field: "name",
        metadata_field: "inventory_metadata",
      },
      {
        type: "label",
        id_field: "inventory_id",
        name_field: "name",
        metadata_field: "inventory_metadata",
      },
    ],
  },
  gam: {
    adapter_name: "gam",
    supports_inventory_sync: true,
    supports_inventory_profiles: true,
    inventory_entity_label: "Inventory",
    entities: [
      {
        type: "ad_unit",
        id_field: "inventory_id",
        name_field: "name",
        path_field: "path",
        metadata_field: "inventory_metadata",
      },
      {
        type: "placement",
        id_field: "inventory_id",
        name_field: "name",
        path_field: "path",
        metadata_field: "inventory_metadata",
      },
    ],
  },
  broadstreet: {
    adapter_name: "broadstreet",
    supports_inventory_sync: true,
    supports_inventory_profiles: true,
    inventory_entity_label: "Zones",
    entities: [
      {
        type: "zone",
        id_field: "inventory_id",
        name_field: "name",
        metadata_field: "inventory_metadata",
      },
    ],
  },
  mock: {
    adapter_name: "mock",
    supports_inventory_sync: false,
    supports_inventory_profiles: false,
    inventory_entity_label: "Mock Items",
    entities: [],
  },
  kevel: {
    adapter_name: "kevel",
    supports_inventory_sync: false,
    supports_inventory_profiles: false,
    inventory_entity_label: "Items",
    entities: [],
  },
  triton: {
    adapter_name: "triton",
    supports_inventory_sync: false,
    supports_inventory_profiles: false,
    inventory_entity_label: "Items",
    entities: [],
  },
};

const inventorySchemaRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/tenant/:id/adapter/:name/inventory_schema", { schema: inventorySchemaRouteSchema }, async (request, reply) => {
    const { id, name } = request.params as { id: string; name: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const adapterName = name.trim().toLowerCase();
    const schema = ADAPTER_INVENTORY_SCHEMAS[adapterName];
    if (!schema) {
      return reply.code(404).send({
        error: `Unknown adapter '${adapterName}'`,
      });
    }

    return reply.send({ ...DEFAULT_SCHEMA, ...schema, adapter_name: adapterName });
  });
};

export default inventorySchemaRoute;
