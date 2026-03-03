/**
 * GAM inventory sync and tree. Parity with _legacy inventory.py:
 * POST /api/tenant/:id/inventory/sync, GET .../inventory/tree, GET .../inventory/search
 */
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { adapterConfigs } from "../../../db/schema/adapterConfigs.js";
import { gamInventory } from "../../../db/schema/gamInventory.js";
import { inventoryProfiles } from "../../../db/schema/inventoryProfiles.js";
import { syncJobs } from "../../../db/schema/syncJobs.js";
import { tenants } from "../../../db/schema/tenants.js";
import {
  inventorySearchRouteSchema,
  inventoryTreeRouteSchema,
  syncInventoryRouteSchema,
} from "../../../routes/schemas/admin/gamInventory/syncTree.schema.js";
import { requireTenantAccess } from "../../services/authGuard.js";

const syncTreeRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Legacy page route compatibility: inventory browser now maps to inventory profiles.
  fastify.get("/tenant/:id/inventory", async (request, reply) => {
    const { id: tenantId } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, tenantId))) return;
    return reply.send({
      tenant_id: tenantId,
      legacy_route: true,
      redirect_to: `/tenant/${tenantId}/inventory-profiles`,
      message: "Inventory browser moved to Inventory Profiles.",
    });
  });

  // Legacy page route compatibility for targeting browser.
  fastify.get("/tenant/:id/targeting", async (request, reply) => {
    const { id: tenantId } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, tenantId))) return;
    return reply.send({
      tenant_id: tenantId,
      legacy_route: true,
      message: "Use /api/tenant/:id/targeting/all and /api/tenant/:id/targeting/values/:key_id for targeting data.",
    });
  });

  // Legacy helper endpoint: summarized sync status.
  fastify.get("/tenant/:id/check-inventory-sync", async (request, reply) => {
    const { id: tenantId } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, tenantId))) return;

    const [tenant] = await db.select().from(tenants).where(eq(tenants.tenantId, tenantId)).limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const [latestJob] = await db
      .select()
      .from(syncJobs)
      .where(and(eq(syncJobs.tenantId, tenantId), eq(syncJobs.syncType, "inventory")))
      .orderBy(desc(syncJobs.startedAt))
      .limit(1);

    return reply.send({
      tenant_id: tenantId,
      has_sync_history: Boolean(latestJob),
      sync_running: latestJob?.status === "running" || latestJob?.status === "pending",
      last_sync: latestJob?.completedAt?.toISOString() ?? null,
      last_status: latestJob?.status ?? "not_started",
      last_error: latestJob?.errorMessage ?? null,
      sync_id: latestJob?.syncId ?? null,
    });
  });

  // Legacy helper endpoint: lightweight inventory analysis summary.
  fastify.get("/tenant/:id/analyze-ad-server", async (request, reply) => {
    const { id: tenantId } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, tenantId))) return;

    const [tenant] = await db.select().from(tenants).where(eq(tenants.tenantId, tenantId)).limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const items = await db
      .select()
      .from(gamInventory)
      .where(eq(gamInventory.tenantId, tenantId));

    const audiences = items
      .filter((i) => i.inventoryType === "audience_segment")
      .slice(0, 50)
      .map((i) => ({
        id: i.inventoryId,
        name: i.name,
        size: Number(((i.inventoryMetadata as Record<string, unknown>)?.["size"] as number | undefined) ?? 0),
      }));

    const seenFormats = new Set<string>();
    for (const i of items) {
      const sizes = (i.inventoryMetadata as Record<string, unknown>)?.["sizes"];
      if (Array.isArray(sizes)) {
        for (const size of sizes) {
          if (typeof size === "string" && size.includes("x")) seenFormats.add(size);
        }
      }
    }
    const formats = [...seenFormats].slice(0, 100).map((size) => ({
      id: `display_${size}`,
      name: size,
      dimensions: size,
    }));

    const placements = items
      .filter((i) => i.inventoryType === "placement")
      .slice(0, 100)
      .map((i) => ({
        id: i.inventoryId,
        name: i.name,
      }));

    return reply.send({ audiences, formats, placements });
  });

  fastify.post("/api/tenant/:id/inventory/sync", { schema: syncInventoryRouteSchema }, async (request, reply) => {
    const { id: tenantId } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, tenantId))) return;

    const [tenant] = await db.select().from(tenants).where(eq(tenants.tenantId, tenantId)).limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const adServer = tenant.adServer ?? "mock";
    if (adServer !== "google_ad_manager") {
      return reply.code(400).send({
        error: `Inventory sync is only available for Google Ad Manager. Your tenant is using the '${adServer}' adapter.`,
      });
    }

    const [adapter] = await db
      .select()
      .from(adapterConfigs)
      .where(and(eq(adapterConfigs.tenantId, tenantId), eq(adapterConfigs.adapterType, "google_ad_manager")))
      .limit(1);
    if (!adapter?.gamNetworkCode) {
      return reply.code(400).send({
        error:
          "Please connect your GAM account before trying to sync inventory. Go to Ad Server settings to configure GAM.",
      });
    }

    const [running] = await db
      .select()
      .from(syncJobs)
      .where(
        and(
          eq(syncJobs.tenantId, tenantId),
          eq(syncJobs.syncType, "inventory"),
          eq(syncJobs.status, "running")
        )
      )
      .limit(1);
    if (running) {
      return reply.code(400).send({ error: "Sync already in progress", sync_id: running.syncId });
    }

    const syncId = `sync_${tenantId}_${Math.floor(Date.now() / 1000)}`;
    await db.insert(syncJobs).values({
      syncId,
      tenantId,
      adapterType: "google_ad_manager",
      syncType: "inventory",
      status: "pending",
      startedAt: new Date(),
      triggeredBy: "admin_ui",
      triggeredById: "inventory_sync",
    });

    return reply.code(202).send({
      sync_id: syncId,
      status: "running",
      message: `Sync started in background. Check status at /api/sync/status/${syncId}`,
    });
  });

  fastify.get("/api/tenant/:id/inventory/tree", { schema: inventoryTreeRouteSchema }, async (request, reply) => {
    const { id: tenantId } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, tenantId))) return;
    const search = String((request.query as { search?: string }).search ?? "").trim();

    const [tenant] = await db.select().from(tenants).where(eq(tenants.tenantId, tenantId)).limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    let units = await db
      .select()
      .from(gamInventory)
      .where(
        and(
          eq(gamInventory.tenantId, tenantId),
          eq(gamInventory.inventoryType, "ad_unit"),
          eq(gamInventory.status, "ACTIVE")
        )
      );

    if (search) {
      units = units.filter(
        (u) =>
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          (u.path && JSON.stringify(u.path).toLowerCase().includes(search.toLowerCase()))
      );
    }

    const matchingIds = new Set(units.map((u) => u.inventoryId));
    let allUnits = units;
    if (search && units.length > 0) {
      const parentIds = new Set<string>();
      for (const u of units) {
        const meta = (u.inventoryMetadata as Record<string, unknown>) ?? {};
        let pid = meta.parent_id as string | undefined;
        while (pid) {
          parentIds.add(pid);
          const [parent] = await db
            .select()
            .from(gamInventory)
            .where(and(eq(gamInventory.tenantId, tenantId), eq(gamInventory.inventoryId, pid)))
            .limit(1);
          pid = parent ? (parent.inventoryMetadata as Record<string, unknown>)?.parent_id as string : undefined;
        }
      }
      if (parentIds.size > 0) {
        const ancestors = await db
          .select()
          .from(gamInventory)
          .where(and(eq(gamInventory.tenantId, tenantId), inArray(gamInventory.inventoryId, [...parentIds])));
        const seen = new Set(units.map((u) => u.inventoryId));
        const extra: typeof units = [];
        for (const a of ancestors) {
          if (!seen.has(a.inventoryId)) {
            seen.add(a.inventoryId);
            extra.push(a);
          }
        }
        allUnits = [...units, ...extra];
      }
    }

    const byId: Record<string, { id: string; name: string; status: string; code: string; path: string[]; parent_id?: string; has_children: boolean; matched_search: boolean; sizes: unknown[]; children: unknown[] }> = {};
    const roots: unknown[] = [];
    for (const u of allUnits) {
      const meta = (u.inventoryMetadata as Record<string, unknown>) ?? {};
      byId[u.inventoryId] = {
        id: u.inventoryId,
        name: u.name,
        status: u.status,
        code: (meta.ad_unit_code as string) ?? "",
        path: u.path ?? [u.name],
        parent_id: meta.parent_id as string | undefined,
        has_children: (meta.has_children as boolean) ?? false,
        matched_search: matchingIds.has(u.inventoryId),
        sizes: (meta.sizes as unknown[]) ?? [],
        children: [],
      };
    }
    for (const obj of Object.values(byId)) {
      const parentId = obj.parent_id;
      if (parentId && byId[parentId]) byId[parentId].children.push(obj);
      else roots.push(obj);
    }

    const [placementsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(gamInventory)
      .where(
        and(
          eq(gamInventory.tenantId, tenantId),
          eq(gamInventory.inventoryType, "placement"),
          eq(gamInventory.status, "ACTIVE")
        )
      );
    const [labelsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(gamInventory)
      .where(
        and(
          eq(gamInventory.tenantId, tenantId),
          eq(gamInventory.inventoryType, "label"),
          eq(gamInventory.status, "ACTIVE")
        )
      );
    const [targetingCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(gamInventory)
      .where(
        and(
          eq(gamInventory.tenantId, tenantId),
          eq(gamInventory.inventoryType, "custom_targeting_key"),
          eq(gamInventory.status, "ACTIVE")
        )
      );
    const [audienceSegmentsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(gamInventory)
      .where(
        and(
          eq(gamInventory.tenantId, tenantId),
          eq(gamInventory.inventoryType, "audience_segment")
        )
      );

    // Last successful inventory sync timestamp
    const [lastSyncJob] = await db
      .select({ completedAt: syncJobs.completedAt })
      .from(syncJobs)
      .where(
        and(
          eq(syncJobs.tenantId, tenantId),
          eq(syncJobs.syncType, "inventory"),
          eq(syncJobs.status, "completed")
        )
      )
      .orderBy(desc(syncJobs.completedAt))
      .limit(1);

    return reply.send({
      root_units: roots,
      total_units: allUnits.length,
      root_count: roots.length,
      placements: placementsCount?.count ?? 0,
      labels: labelsCount?.count ?? 0,
      custom_targeting_keys: targetingCount?.count ?? 0,
      audience_segments: audienceSegmentsCount?.count ?? 0,
      search_active: search.length > 0,
      matching_count: matchingIds.size,
      last_sync: lastSyncJob?.completedAt?.toISOString() ?? null,
    });
  });

  fastify.get("/api/tenant/:id/inventory/search", { schema: inventorySearchRouteSchema }, async (request, reply) => {
    const { id: tenantId } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, tenantId))) return;
    const search = String((request.query as { search?: string }).search ?? "").trim();
    const typeFilter = (request.query as { type?: string }).type;
    const status = (request.query as { status?: string }).status ?? "ACTIVE";

    const [tenant] = await db.select().from(tenants).where(eq(tenants.tenantId, tenantId)).limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const whereClause =
      typeFilter && status.toUpperCase() !== "ALL"
        ? and(eq(gamInventory.tenantId, tenantId), eq(gamInventory.inventoryType, typeFilter), eq(gamInventory.status, status))
        : typeFilter
          ? and(eq(gamInventory.tenantId, tenantId), eq(gamInventory.inventoryType, typeFilter))
          : status.toUpperCase() !== "ALL"
            ? and(eq(gamInventory.tenantId, tenantId), inArray(gamInventory.inventoryType, ["ad_unit", "placement"]), eq(gamInventory.status, status))
            : and(eq(gamInventory.tenantId, tenantId), inArray(gamInventory.inventoryType, ["ad_unit", "placement"]));

    let items = await db.select().from(gamInventory).where(whereClause).limit(500);

    if (search) {
      const lower = search.toLowerCase();
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(lower) ||
          (i.path && JSON.stringify(i.path).toLowerCase().includes(lower))
      );
    }

    const result = items.map((i) => ({
      id: i.inventoryId,
      name: i.name,
      type: i.inventoryType,
      path: i.path ?? [i.name],
      status: i.status,
      metadata: i.inventoryMetadata ?? {},
    }));

    return reply.send({
      items: result,
      count: result.length,
      total: result.length,
      has_more: result.length >= 500,
    });
  });

  fastify.get("/api/tenant/:id/inventory-stats", async (request, reply) => {
    const { id: tenantId } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, tenantId))) return;

    const rows = await db
      .select({ inventoryType: gamInventory.inventoryType, status: gamInventory.status })
      .from(gamInventory)
      .where(eq(gamInventory.tenantId, tenantId));

    const stats: Record<string, Record<string, number>> = {};
    for (const row of rows) {
      const typeKey = row.inventoryType;
      const statusKey = row.status ?? "UNKNOWN";
      if (!stats[typeKey]) stats[typeKey] = {};
      stats[typeKey][statusKey] = (stats[typeKey][statusKey] ?? 0) + 1;
    }
    return reply.send({ tenant_id: tenantId, stats });
  });

  fastify.get("/api/tenant/:id/inventory-list", async (request, reply) => {
    const { id: tenantId } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, tenantId))) return;

    const q = request.query as { type?: string; search?: string; status?: string; ids?: string };
    const typeFilter = q.type?.trim();
    const search = (q.search ?? "").trim().toLowerCase();
    const status = (q.status ?? "ACTIVE").trim();
    const ids = (q.ids ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    let rows;
    if (ids.length > 0) {
      rows = await db
        .select()
        .from(gamInventory)
        .where(and(eq(gamInventory.tenantId, tenantId), inArray(gamInventory.inventoryId, ids)));
    } else {
      const whereClause =
        typeFilter && status.toUpperCase() !== "ALL"
          ? and(eq(gamInventory.tenantId, tenantId), eq(gamInventory.inventoryType, typeFilter), eq(gamInventory.status, status))
          : typeFilter
            ? and(eq(gamInventory.tenantId, tenantId), eq(gamInventory.inventoryType, typeFilter))
            : status.toUpperCase() !== "ALL"
              ? and(
                  eq(gamInventory.tenantId, tenantId),
                  inArray(gamInventory.inventoryType, ["ad_unit", "placement"]),
                  eq(gamInventory.status, status),
                )
              : and(eq(gamInventory.tenantId, tenantId), inArray(gamInventory.inventoryType, ["ad_unit", "placement"]));
      rows = await db.select().from(gamInventory).where(whereClause).limit(500);
    }

    let filtered = rows;
    if (search) {
      filtered = rows.filter((i) => {
        const pathStr = JSON.stringify(i.path ?? []).toLowerCase();
        return i.name.toLowerCase().includes(search) || pathStr.includes(search);
      });
    }

    filtered.sort((a, b) => {
      if (a.inventoryType !== b.inventoryType) return a.inventoryType.localeCompare(b.inventoryType);
      return a.name.localeCompare(b.name);
    });

    const items = filtered.map((i) => ({
      id: i.inventoryId,
      name: i.name,
      type: i.inventoryType,
      path: i.path ?? [i.name],
      status: i.status,
      metadata: i.inventoryMetadata ?? {},
    }));

    if (ids.length > 0) {
      return reply.send({ items, total: items.length });
    }
    return reply.send({ items, count: items.length, has_more: items.length >= 500 });
  });

  fastify.get("/api/tenant/:id/inventory/sizes", async (request, reply) => {
    const { id: tenantId } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, tenantId))) return;

    const q = request.query as { ids?: string; profile_id?: string };
    const ids = (q.ids ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const inventoryIds = new Set<string>(ids);
    const profileId = (q.profile_id ?? "").trim();
    if (profileId) {
      const numericId = Number(profileId);
      const [profile] = await db
        .select({ profileId: inventoryProfiles.profileId, inventoryConfig: inventoryProfiles.inventoryConfig })
        .from(inventoryProfiles)
        .where(
          Number.isFinite(numericId)
            ? and(eq(inventoryProfiles.tenantId, tenantId), eq(inventoryProfiles.id, numericId))
            : and(eq(inventoryProfiles.tenantId, tenantId), eq(inventoryProfiles.profileId, profileId)),
        )
        .limit(1);
      if (!profile) return reply.code(404).send({ error: "Inventory profile not found" });
      const inv = (profile.inventoryConfig ?? {}) as Record<string, unknown>;
      for (const id of Array.isArray(inv["ad_units"]) ? (inv["ad_units"] as unknown[]) : []) {
        if (typeof id === "string") inventoryIds.add(id);
      }
      for (const id of Array.isArray(inv["placements"]) ? (inv["placements"] as unknown[]) : []) {
        if (typeof id === "string") inventoryIds.add(id);
      }
    }

    if (inventoryIds.size === 0) return reply.send({ sizes: [], count: 0 });

    const rows = await db
      .select({ metadata: gamInventory.inventoryMetadata })
      .from(gamInventory)
      .where(and(eq(gamInventory.tenantId, tenantId), inArray(gamInventory.inventoryId, [...inventoryIds])));

    const sizes = new Set<string>();
    for (const row of rows) {
      const meta = (row.metadata ?? {}) as Record<string, unknown>;
      const vals = meta["sizes"];
      if (!Array.isArray(vals)) continue;
      for (const value of vals) {
        if (typeof value === "string" && value.includes("x")) sizes.add(value);
      }
    }

    const sortedSizes = [...sizes].sort((a, b) => {
      const [aw, ah] = a.split("x").map((v) => Number(v));
      const [bw, bh] = b.split("x").map((v) => Number(v));
      const aW = Number.isFinite(aw) ? aw : 0;
      const bW = Number.isFinite(bw) ? bw : 0;
      if (aW !== bW) return aW - bW;
      const aH = Number.isFinite(ah) ? ah : 0;
      const bH = Number.isFinite(bh) ? bh : 0;
      return aH - bH;
    });

    return reply.send({ sizes: sortedSizes, count: sortedSizes.length });
  });
};

export default syncTreeRoute;
