/**
 * GAM targeting data API. Parity with _legacy inventory.py:
 * GET /api/tenant/:id/targeting/all, GET /api/tenant/:id/targeting/values/:key_id
 */
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { adapterConfigs } from "../../../db/schema/adapterConfigs.js";
import { gamInventory } from "../../../db/schema/gamInventory.js";
import { tenants } from "../../../db/schema/tenants.js";
import { buildGamClient } from "../../../gam/gamClient.js";
import {
  getTargetingAllRouteSchema,
  getTargetingValuesRouteSchema,
} from "../../../routes/schemas/admin/gamInventory/targeting.schema.js";
import { requireTenantAccess } from "../../services/authGuard.js";

const targetingRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/api/tenant/:id/targeting/all", { schema: getTargetingAllRouteSchema }, async (request, reply) => {
    const { id: tenantId } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, tenantId))) return;

    const [tenant] = await db.select().from(tenants).where(eq(tenants.tenantId, tenantId)).limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const customKeysRows = await db
      .select()
      .from(gamInventory)
      .where(
        and(
          eq(gamInventory.tenantId, tenantId),
          eq(gamInventory.inventoryType, "custom_targeting_key")
        )
      );

    const audienceRows = await db
      .select()
      .from(gamInventory)
      .where(
        and(
          eq(gamInventory.tenantId, tenantId),
          eq(gamInventory.inventoryType, "audience_segment")
        )
      );

    const labelRows = await db
      .select()
      .from(gamInventory)
      .where(
        and(eq(gamInventory.tenantId, tenantId), eq(gamInventory.inventoryType, "label"))
      );

    const [lastSyncRow] = await db
      .select({ lastSynced: gamInventory.lastSynced })
      .from(gamInventory)
      .where(eq(gamInventory.tenantId, tenantId))
      .orderBy(desc(gamInventory.lastSynced))
      .limit(1);

    const customKeys = customKeysRows.map((row) => {
      const meta = (row.inventoryMetadata as Record<string, unknown>) ?? {};
      return {
        id: row.inventoryId,
        name: row.name,
        display_name: (meta.display_name as string) ?? row.name,
        status: row.status ?? "UNKNOWN",
        type: (meta.type as string) ?? "UNKNOWN",
      };
    });

    const audiences = audienceRows.map((row) => {
      const meta = (row.inventoryMetadata as Record<string, unknown>) ?? {};
      return {
        id: row.inventoryId,
        name: row.name,
        description: meta.description,
        status: row.status ?? "UNKNOWN",
        size: meta.size,
        type: (meta.type as string) ?? "UNKNOWN",
      };
    });

    const labels = labelRows.map((row) => {
      const meta = (row.inventoryMetadata as Record<string, unknown>) ?? {};
      return {
        id: row.inventoryId,
        name: row.name,
        description: meta.description,
        is_active: row.status === "ACTIVE",
      };
    });

    return reply.send({
      customKeys,
      audiences,
      labels,
      last_sync: lastSyncRow?.lastSynced?.toISOString() ?? null,
    });
  });

  fastify.get("/api/tenant/:id/targeting/values/:key_id", { schema: getTargetingValuesRouteSchema }, async (request, reply) => {
    const { id: tenantId, key_id: keyId } = request.params as { id: string; key_id: string };
    if (!(await requireTenantAccess(request, reply, tenantId))) return;

    const [tenant] = await db.select().from(tenants).where(eq(tenants.tenantId, tenantId)).limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const [keyRow] = await db
      .select()
      .from(gamInventory)
      .where(
        and(
          eq(gamInventory.tenantId, tenantId),
          eq(gamInventory.inventoryType, "custom_targeting_key"),
          eq(gamInventory.inventoryId, keyId)
        )
      )
      .limit(1);
    if (!keyRow) return reply.code(404).send({ error: "Custom targeting key not found" });

    const [adapterConfig] = await db
      .select()
      .from(adapterConfigs)
      .where(eq(adapterConfigs.tenantId, tenantId))
      .limit(1);

    if (!adapterConfig) {
      return reply.code(400).send({ error: "No adapter configured for this tenant" });
    }
    if (!adapterConfig.gamNetworkCode) {
      return reply.code(400).send({ error: "GAM network code not configured" });
    }
    const hasOAuth = Boolean(adapterConfig.gamRefreshToken);
    const hasServiceAccount = Boolean(adapterConfig.gamServiceAccountJson);
    if (!hasOAuth && !hasServiceAccount) {
      return reply.code(400).send({
        error: "GAM authentication not configured. Please connect to GAM in tenant settings.",
      });
    }

    const numericKeyId = Number(keyId);
    if (!Number.isFinite(numericKeyId)) {
      return reply.code(400).send({ error: "Invalid custom targeting key ID" });
    }

    try {
      const gamClient = buildGamClient(adapterConfig);
      const customTargetingService = await gamClient.getService("CustomTargetingService");

      const query = `WHERE customTargetingKeyId = ${numericKeyId} LIMIT 1000 OFFSET 0`;
      const response = (await (customTargetingService as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>)
        .getCustomTargetingValuesByStatement({ query })) as Record<string, unknown>;

      const results = (response["results"] as unknown[]) ?? [];
      const values = results.map((item) => {
        const value = item as Record<string, unknown>;
        return {
          id: String(value["id"] ?? ""),
          name: typeof value["name"] === "string" ? value["name"] : "",
          display_name:
            typeof value["displayName"] === "string"
              ? value["displayName"]
              : typeof value["name"] === "string"
                ? value["name"]
                : "",
          match_type: typeof value["matchType"] === "string" ? value["matchType"] : "EXACT",
          status: typeof value["status"] === "string" ? value["status"] : "ACTIVE",
          key_id: keyId,
          key_name: keyRow.name,
        };
      });

      return reply.send({ values, count: values.length });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return reply.code(500).send({ error: `Failed to fetch targeting values: ${msg}` });
    }
  });
};

export default targetingRoute;
