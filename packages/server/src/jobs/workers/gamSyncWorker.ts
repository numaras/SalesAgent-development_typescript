/**
 * BullMQ worker: processes GAM sync jobs enqueued by syncApi.ts.
 *
 * Mirrors the Python background_sync_service.py thread-based pattern but uses
 * BullMQ for reliable, retryable, observable background processing.
 *
 * Supported syncTypes:
 *   "full" | "incremental" — inventory (ad units + placements)
 *   "orders"               — orders + line items
 */
import { Worker, type Job } from "bullmq";
import { and, eq, notInArray } from "drizzle-orm";

import { db } from "../../db/client.js";
import { adapterConfigs } from "../../db/schema/adapterConfigs.js";
import { gamInventory } from "../../db/schema/gamInventory.js";
import { gamLineItems, gamOrders } from "../../db/schema/gamInventory.js";
import { syncJobs } from "../../db/schema/syncJobs.js";
import { buildGamClient } from "../../gam/gamClient.js";
import { redisConnectionOptions } from "../queues.js";
import type { GamSyncJobData } from "../queues.js";
import { getProcessLogger } from "../../utils/processLogger.js";

const log = getProcessLogger("gam-sync-worker");

const PAGE_LIMIT = 500;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Safely parse a GAM datetime object → JS Date | null */
function parseGamDate(dt: unknown): Date | null {
  if (!dt || typeof dt !== "object") return null;
  const d = dt as Record<string, unknown>;
  const dateField = d["date"] as Record<string, unknown> | undefined;
  if (!dateField) return null;
  const year = dateField["year"];
  const month = dateField["month"];
  const day = dateField["day"];
  if (typeof year !== "number" || typeof month !== "number" || typeof day !== "number") return null;
  const hour = typeof d["hour"] === "number" ? d["hour"] : 0;
  const minute = typeof d["minute"] === "number" ? d["minute"] : 0;
  const second = typeof d["second"] === "number" ? d["second"] : 0;
  try {
    return new Date(year, month - 1, day, hour, minute, second);
  } catch {
    return null;
  }
}

/** Extract a numeric string from a GAM value field */
function gamStr(val: unknown): string | null {
  if (val == null) return null;
  if (typeof val === "string") return val;
  if (typeof val === "number") return String(val);
  return null;
}

function gamNum(val: unknown): number | null {
  if (val == null) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

// ---------------------------------------------------------------------------
// Mark sync job helpers
// ---------------------------------------------------------------------------

async function markRunning(syncId: string, tenantId: string, syncType: string) {
  await db
    .update(syncJobs)
    .set({ status: "running", startedAt: new Date() })
    .where(eq(syncJobs.syncId, syncId));
  log.info(`Job started: ${syncType} sync`, { tenantId, syncId, syncType, status: "running" });
}

async function markCompleted(syncId: string, tenantId: string, summary: Record<string, unknown>) {
  await db
    .update(syncJobs)
    .set({ status: "completed", completedAt: new Date(), summary: JSON.stringify(summary) })
    .where(eq(syncJobs.syncId, syncId));
  log.info(`Job completed: ${String(summary.sync_type ?? "unknown")} sync`, { tenantId, syncId, ...summary });
}

async function markFailed(syncId: string, tenantId: string, errorMessage: string) {
  await db
    .update(syncJobs)
    .set({ status: "failed", completedAt: new Date(), errorMessage })
    .where(eq(syncJobs.syncId, syncId));
  log.error(`Job failed: ${errorMessage}`, { tenantId, syncId, error: errorMessage });
}

// ---------------------------------------------------------------------------
// Inventory sync (ad units + placements)
// ---------------------------------------------------------------------------

async function syncInventory(
  tenantId: string,
  gamClient: Awaited<ReturnType<typeof buildGamClient>>,
  isFull: boolean,
): Promise<{ adUnits: number; placements: number }> {
  log.debug(`Fetching GAM InventoryService and PlacementService`, { tenantId });
  const inventoryService = await gamClient.getService("InventoryService");
  const placementService = await gamClient.getService("PlacementService");

  // Fetch all active ad units in pages
  const adUnitIds: string[] = [];
  let adUnitsTotal = 0;
  let offset = 0;
  for (;;) {
    const statement = `WHERE status = 'ACTIVE' LIMIT ${PAGE_LIMIT} OFFSET ${offset}`;
    const page = (await (inventoryService as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>)
      .getAdUnitsByStatement({ query: statement })) as Record<string, unknown>;

    const results = (page["results"] as unknown[]) ?? [];
    if (results.length === 0) break;

    const rows = results.map((u) => {
      const unit = u as Record<string, unknown>;
      const id = gamStr(unit["id"]) ?? "";
      adUnitIds.push(id);
      const path: string[] = [];
      const parentPath = unit["parentPath"] as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(parentPath)) {
        for (const node of parentPath) {
          if (typeof node["name"] === "string") path.push(node["name"]);
        }
      }
      path.push(typeof unit["name"] === "string" ? unit["name"] : id);

      return {
        tenantId,
        inventoryType: "ad_unit",
        inventoryId: id,
        name: typeof unit["name"] === "string" ? unit["name"] : id,
        path,
        status: typeof unit["status"] === "string" ? unit["status"] : "ACTIVE",
        inventoryMetadata: { sizes: unit["adUnitSizes"] ?? [] },
        lastSynced: new Date(),
        updatedAt: new Date(),
      };
    });

    for (const row of rows) {
      await db
        .insert(gamInventory)
        .values(row)
        .onConflictDoUpdate({
          target: [gamInventory.tenantId, gamInventory.inventoryType, gamInventory.inventoryId],
          set: {
            name: row.name,
            path: row.path,
            status: row.status,
            inventoryMetadata: row.inventoryMetadata,
            lastSynced: row.lastSynced,
            updatedAt: row.updatedAt,
          },
        });
    }

    adUnitsTotal += results.length;
    offset += PAGE_LIMIT;
    log.debug(`Ad units page synced`, { tenantId, offset, pageCount: results.length, totalSoFar: adUnitsTotal });
    if (results.length < PAGE_LIMIT) break;
  }
  log.info(`Ad units sync complete`, { tenantId, total: adUnitsTotal });

  // Fetch placements
  let placementsTotal = 0;
  offset = 0;
  for (;;) {
    const statement = `WHERE status = 'ACTIVE' LIMIT ${PAGE_LIMIT} OFFSET ${offset}`;
    const page = (await (placementService as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>)
      .getPlacementsByStatement({ query: statement })) as Record<string, unknown>;

    const results = (page["results"] as unknown[]) ?? [];
    if (results.length === 0) break;

    const rows = results.map((p) => {
      const placement = p as Record<string, unknown>;
      const id = gamStr(placement["id"]) ?? "";
      return {
        tenantId,
        inventoryType: "placement",
        inventoryId: id,
        name: typeof placement["name"] === "string" ? placement["name"] : id,
        path: [typeof placement["name"] === "string" ? placement["name"] : id],
        status: typeof placement["status"] === "string" ? placement["status"] : "ACTIVE",
        inventoryMetadata: {},
        lastSynced: new Date(),
        updatedAt: new Date(),
      };
    });

    for (const row of rows) {
      await db
        .insert(gamInventory)
        .values(row)
        .onConflictDoUpdate({
          target: [gamInventory.tenantId, gamInventory.inventoryType, gamInventory.inventoryId],
          set: {
            name: row.name,
            status: row.status,
            lastSynced: row.lastSynced,
            updatedAt: row.updatedAt,
          },
        });
    }

    placementsTotal += results.length;
    offset += PAGE_LIMIT;
    log.debug(`Placements page synced`, { tenantId, offset, pageCount: results.length, totalSoFar: placementsTotal });
    if (results.length < PAGE_LIMIT) break;
  }
  log.info(`Placements sync complete`, { tenantId, total: placementsTotal });

  // On full sync, remove stale ad unit records no longer returned by GAM
  if (isFull && adUnitIds.length > 0) {
    await db
      .delete(gamInventory)
      .where(
        and(
          eq(gamInventory.tenantId, tenantId),
          eq(gamInventory.inventoryType, "ad_unit"),
          notInArray(gamInventory.inventoryId, adUnitIds),
        ),
      );
  }

  return { adUnits: adUnitsTotal, placements: placementsTotal };
}

// ---------------------------------------------------------------------------
// Orders + line items sync
// ---------------------------------------------------------------------------

async function syncOrders(
  tenantId: string,
  gamClient: Awaited<ReturnType<typeof buildGamClient>>,
): Promise<{ orders: number; lineItems: number }> {
  log.debug(`Fetching GAM OrderService and LineItemService`, { tenantId });
  const orderService = await gamClient.getService("OrderService");
  const lineItemService = await gamClient.getService("LineItemService");

  let ordersTotal = 0;
  let offset = 0;
  for (;;) {
    const statement = `LIMIT ${PAGE_LIMIT} OFFSET ${offset}`;
    const page = (await (orderService as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>)
      .getOrdersByStatement({ query: statement })) as Record<string, unknown>;

    const results = (page["results"] as unknown[]) ?? [];
    if (results.length === 0) break;

    for (const o of results) {
      const order = o as Record<string, unknown>;
      const orderId = gamStr(order["id"]) ?? "";
      const money = order["totalBudget"] as Record<string, unknown> | undefined;

      const row = {
        tenantId,
        orderId,
        name: typeof order["name"] === "string" ? order["name"] : orderId,
        advertiserId: gamStr(order["advertiserId"]),
        advertiserName: typeof order["advertiserName"] === "string" ? order["advertiserName"] : null,
        agencyId: gamStr(order["agencyId"]),
        agencyName: typeof order["agencyName"] === "string" ? order["agencyName"] : null,
        traffickerId: gamStr(order["traffickerId"]),
        traffickerName: typeof order["traffickerName"] === "string" ? order["traffickerName"] : null,
        salespersonId: gamStr(order["salespersonId"]),
        salespersonName: typeof order["salespersonName"] === "string" ? order["salespersonName"] : null,
        status: typeof order["status"] === "string" ? order["status"] : "UNKNOWN",
        startDate: parseGamDate(order["startDateTime"]),
        endDate: parseGamDate(order["endDateTime"]),
        unlimitedEndDate: order["unlimitedEndDateTime"] === true,
        totalBudget: money ? gamNum(money["microAmount"]) : null,
        currencyCode: money ? gamStr(money["currencyCode"]) : null,
        externalOrderId: gamStr(order["externalOrderId"]),
        poNumber: typeof order["poNumber"] === "string" ? order["poNumber"] : null,
        notes: typeof order["notes"] === "string" ? order["notes"] : null,
        lastModifiedDate: parseGamDate(order["lastModifiedDateTime"]),
        isProgrammatic: order["isProgrammatic"] === true,
        appliedLabels: (order["appliedLabels"] as unknown[]) ?? [],
        customFieldValues: (order["customFieldValues"] as Record<string, unknown>) ?? {},
        lastSynced: new Date(),
        updatedAt: new Date(),
      };

      await db
        .insert(gamOrders)
        .values(row)
        .onConflictDoUpdate({
          target: [gamOrders.tenantId, gamOrders.orderId],
          set: {
            name: row.name,
            advertiserId: row.advertiserId,
            advertiserName: row.advertiserName,
            status: row.status,
            startDate: row.startDate,
            endDate: row.endDate,
            totalBudget: row.totalBudget,
            lastModifiedDate: row.lastModifiedDate,
            lastSynced: row.lastSynced,
            updatedAt: row.updatedAt,
          },
        });
    }

    ordersTotal += results.length;
    offset += PAGE_LIMIT;
    log.debug(`Orders page synced`, { tenantId, offset, pageCount: results.length, totalSoFar: ordersTotal });
    if (results.length < PAGE_LIMIT) break;
  }
  log.info(`Orders sync complete`, { tenantId, total: ordersTotal });

  // Sync line items
  let lineItemsTotal = 0;
  offset = 0;
  for (;;) {
    const statement = `LIMIT ${PAGE_LIMIT} OFFSET ${offset}`;
    const page = (await (lineItemService as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>)
      .getLineItemsByStatement({ query: statement })) as Record<string, unknown>;

    const results = (page["results"] as unknown[]) ?? [];
    if (results.length === 0) break;

    for (const li of results) {
      const item = li as Record<string, unknown>;
      const lineItemId = gamStr(item["id"]) ?? "";
      const orderId = gamStr(item["orderId"]) ?? "";

      const primaryGoal = item["primaryGoal"] as Record<string, unknown> | undefined;
      const stats = item["stats"] as Record<string, unknown> | undefined;
      const deliveryData = item["deliveryData"] as Record<string, unknown> | undefined;
      const deliveryIndicator = item["deliveryIndicator"] as Record<string, unknown> | undefined;
      const costMoney = item["costPerUnit"] as Record<string, unknown> | undefined;

      const impressions = gamNum(stats?.["impressionsDelivered"]);
      const clicks = gamNum(stats?.["clicksDelivered"]);
      const ctr = impressions && clicks && impressions > 0 ? clicks / impressions : null;

      const row = {
        tenantId,
        lineItemId,
        orderId,
        name: typeof item["name"] === "string" ? item["name"] : lineItemId,
        status: typeof item["status"] === "string" ? item["status"] : "UNKNOWN",
        lineItemType: typeof item["lineItemType"] === "string" ? item["lineItemType"] : "STANDARD",
        priority: gamNum(item["priority"]) ?? null,
        startDate: parseGamDate(item["startDateTime"]),
        endDate: parseGamDate(item["endDateTime"]),
        unlimitedEndDate: item["unlimitedEndDateTime"] === true,
        costType: typeof item["costType"] === "string" ? item["costType"] : null,
        costPerUnit: costMoney ? gamNum(costMoney["microAmount"]) : null,
        discountType: typeof item["discountType"] === "string" ? item["discountType"] : null,
        discount: gamNum(item["discount"]),
        deliveryRateType: typeof item["deliveryRateType"] === "string" ? item["deliveryRateType"] : null,
        primaryGoalType: typeof primaryGoal?.["goalType"] === "string" ? (primaryGoal["goalType"] as string) : null,
        primaryGoalUnits: primaryGoal ? gamNum(primaryGoal["units"]) : null,
        environmentType: typeof item["environmentType"] === "string" ? item["environmentType"] : null,
        statsImpressions: impressions,
        statsClicks: clicks,
        statsCtr: ctr,
        deliveryIndicatorType:
          typeof deliveryIndicator?.["expectedDeliveryPercentage"] === "number" ? "percentage" : null,
        deliveryData: (deliveryData as Record<string, unknown>) ?? {},
        targeting: (item["targeting"] as Record<string, unknown>) ?? {},
        creativePlaceholders: (item["creativePlaceholders"] as unknown[]) ?? [],
        lastModifiedDate: parseGamDate(item["lastModifiedDateTime"]),
        creationDate: parseGamDate(item["creationDateTime"]),
        lastSynced: new Date(),
        updatedAt: new Date(),
      };

      await db
        .insert(gamLineItems)
        .values(row)
        .onConflictDoUpdate({
          target: [gamLineItems.tenantId, gamLineItems.lineItemId],
          set: {
            name: row.name,
            status: row.status,
            statsImpressions: row.statsImpressions,
            statsClicks: row.statsClicks,
            statsCtr: row.statsCtr,
            lastModifiedDate: row.lastModifiedDate,
            lastSynced: row.lastSynced,
            updatedAt: row.updatedAt,
          },
        });
    }

    lineItemsTotal += results.length;
    offset += PAGE_LIMIT;
    log.debug(`Line items page synced`, { tenantId, offset, pageCount: results.length, totalSoFar: lineItemsTotal });
    if (results.length < PAGE_LIMIT) break;
  }
  log.info(`Line items sync complete`, { tenantId, total: lineItemsTotal });

  return { orders: ordersTotal, lineItems: lineItemsTotal };
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

export function startGamSyncWorker() {
  const worker = new Worker<GamSyncJobData>(
    "gam-sync",
    async (job: Job<GamSyncJobData>) => {
      const { syncId, tenantId, syncType } = job.data;

      await markRunning(syncId, tenantId, syncType);

      // Load adapter config
      const [adapter] = await db
        .select()
        .from(adapterConfigs)
        .where(eq(adapterConfigs.tenantId, tenantId))
        .limit(1);

      if (!adapter) {
        await markFailed(syncId, tenantId, "Adapter config not found");
        throw new Error(`Adapter config not found for tenant ${tenantId}`);
      }

      log.info(`Adapter config loaded, starting ${syncType} sync`, { tenantId, syncId, adapterType: adapter.adapterType });
      const gamClient = buildGamClient(adapter);
      let summary: Record<string, unknown>;

      if (syncType === "orders") {
        const counts = await syncOrders(tenantId, gamClient);
        summary = { ...counts, sync_type: "orders" };
      } else {
        const isFull = syncType === "full";
        const counts = await syncInventory(tenantId, gamClient, isFull);
        summary = { ...counts, sync_type: syncType };
      }

      await markCompleted(syncId, tenantId, summary);
      return summary;
    },
    {
      connection: redisConnectionOptions(),
      concurrency: 3,
    },
  );

  worker.on("failed", async (job, err) => {
    if (job) {
      log.warn(`Job attempt ${job.attemptsMade} failed`, { tenantId: job.data.tenantId, syncId: job.data.syncId, error: err.message });
      // Only mark failed if all attempts are exhausted
      if ((job.attemptsMade ?? 0) >= (job.opts?.attempts ?? 1)) {
        await markFailed(job.data.syncId, job.data.tenantId, err.message).catch(() => undefined);
      }
    }
  });

  return worker;
}
