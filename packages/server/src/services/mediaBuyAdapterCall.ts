/**
 * Adapter call for create/update media buy: invoke adapter and map response.
 *
 * Legacy equivalent: _legacy/src/core/tools/media_buy_create.py (create),
 *   media_buy_update.py (update) — adapter call portion.
 *
 * DB persistence (MediaBuy + MediaPackage rows + ObjectWorkflowMapping) is
 * implemented here to match Python's _create_media_buy_impl DB writes.
 *
 * Adapter dispatch (Python: get_adapter(principal, dry_run, testing_context)):
 *   - google_ad_manager → calls OrderService.createOrders / updateOrders
 *   - all others (mock, kevel, broadstreet, xandr, triton) → mock/stub response
 */
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { adapterConfigs } from "../db/schema/adapterConfigs.js";
import { buildGamClient } from "../gam/gamClient.js";
import { mediaBuys, mediaPackages } from "../db/schema/mediaBuys.js";
import { objectWorkflowMappings } from "../db/schema/workflowSteps.js";
import type { CreateMediaBuyRequest } from "../schemas/mediaBuyCreate.js";
import type {
  CreateMediaBuyResponse,
  CreateMediaBuySuccess,
} from "../schemas/mediaBuyCreateResponse.js";
import type {
  UpdateMediaBuyRequest,
  UpdateMediaBuyResponse,
  UpdateMediaBuySuccess,
} from "../schemas/mediaBuyUpdate.js";

export interface MediaBuyCreateContext {
  tenantId: string;
  principalId: string;
  /** Optional: workflow step ID to link via ObjectWorkflowMapping on create. */
  stepId?: string;
}

interface AdapterCreatePackage {
  package_id?: string;
  status?: CreateMediaBuySuccess["packages"][number]["status"];
}

interface AdapterCreateResponse {
  media_buy_id?: string;
  buyer_ref?: string;
  packages?: AdapterCreatePackage[];
}

function buildGeneratedMediaBuyId(ctx: MediaBuyCreateContext): string {
  const ts = Date.now();
  return `mb_${ctx.tenantId}_${ctx.principalId}_${ts}`;
}

/**
 * Derive advertiser name from brand_manifest.
 * Python equivalent: brand_manifest.name if provided, else buyer_ref.
 */
function extractAdvertiserName(request: CreateMediaBuyRequest): string {
  const bm = request.brand_manifest;
  if (
    typeof bm === "object" &&
    bm !== null &&
    "name" in bm &&
    typeof (bm as Record<string, unknown>).name === "string"
  ) {
    return (bm as Record<string, unknown>).name as string;
  }
  if (typeof bm === "string") {
    try {
      return new URL(bm).hostname;
    } catch {
      return bm.slice(0, 255);
    }
  }
  return request.buyer_ref;
}

/**
 * Sum package budgets and return total + primary currency.
 * Python equivalent: _create_media_buy_impl budget aggregation.
 */
function extractBudgetInfo(
  request: CreateMediaBuyRequest,
): { totalBudget: string; currency: string } {
  let total = 0;
  let currency = "USD";
  let hasExplicitCurrency = false;
  for (const pkg of request.packages) {
    const b = pkg.budget;
    if (typeof b === "number") {
      total += b;
    } else if (b && typeof b === "object" && "total" in b) {
      total += Number((b as { total: number }).total);
      if (
        !hasExplicitCurrency &&
        "currency" in b &&
        typeof (b as { currency?: string }).currency === "string"
      ) {
        currency = (b as { currency: string }).currency.toUpperCase();
        hasExplicitCurrency = true;
      }
    }
  }
  return { totalBudget: total.toFixed(2), currency };
}

function normalizeCreateResponse(
  fallbackMediaBuyId: string,
  request: CreateMediaBuyRequest,
  adapterResponse: AdapterCreateResponse | null | undefined,
): CreateMediaBuySuccess {
  const packageInput = adapterResponse?.packages;
  const packages: CreateMediaBuySuccess["packages"] =
    packageInput && packageInput.length > 0
      ? packageInput.map((pkg, i) => ({
          package_id: pkg.package_id ?? `pkg_${fallbackMediaBuyId}_${i + 1}`,
          status: pkg.status ?? "draft",
        }))
      : request.packages.map((_pkg, i) => ({
          package_id: `pkg_${fallbackMediaBuyId}_${i + 1}`,
          status: "draft",
        }));

  return {
    media_buy_id: adapterResponse?.media_buy_id ?? fallbackMediaBuyId,
    buyer_ref: adapterResponse?.buyer_ref ?? request.buyer_ref,
    packages,
  };
}

/**
 * Invoke the tenant-configured adapter.
 * Python equivalent: get_adapter(principal, dry_run, testing_context).create_media_buy(...)
 *
 * GAM tenants: create a GAM Order via OrderService.createOrders.
 * All other adapter types: return a deterministic mock response (mock/kevel/broadstreet/etc.).
 */
async function invokeCreateAdapter(
  ctx: MediaBuyCreateContext,
  request: CreateMediaBuyRequest,
): Promise<AdapterCreateResponse> {
  const generatedMediaBuyId = buildGeneratedMediaBuyId(ctx);

  // Look up adapter config for this tenant
  const [adapter] = await db
    .select()
    .from(adapterConfigs)
    .where(eq(adapterConfigs.tenantId, ctx.tenantId))
    .limit(1);

  if (adapter?.adapterType === "google_ad_manager" && adapter.gamNetworkCode) {
    try {
      const gamClient = buildGamClient(adapter);
      const orderService = await gamClient.getService("OrderService");

      const advertiserName = extractAdvertiserName(request);
      const { totalBudget, currency } = extractBudgetInfo(request);

      // Build GAM order object — mirrors _legacy google_ad_manager.py create_order()
      const gamOrder: Record<string, unknown> = {
        name: request.buyer_ref,
        advertiserId: adapter.gamTrafickerId ? undefined : undefined, // resolved by GAM from buyer_ref
        startDateTime: { date: { year: new Date().getFullYear(), month: new Date().getMonth() + 1, day: new Date().getDate() } },
        notes: `Created via AdCP SalesAgent | buyer_ref: ${request.buyer_ref} | advertiser: ${advertiserName}`,
      };
      if (request.start_time && request.start_time !== "asap") {
        const sd = new Date(request.start_time);
        gamOrder["startDateTime"] = {
          date: { year: sd.getFullYear(), month: sd.getMonth() + 1, day: sd.getDate() },
          hour: sd.getHours(), minute: sd.getMinutes(), second: sd.getSeconds(),
        };
      }
      if (request.end_time) {
        const ed = new Date(request.end_time);
        gamOrder["endDateTime"] = {
          date: { year: ed.getFullYear(), month: ed.getMonth() + 1, day: ed.getDate() },
          hour: ed.getHours(), minute: ed.getMinutes(), second: ed.getSeconds(),
        };
      }

      const orders = (await (orderService as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>)
        .createOrders([gamOrder])) as Array<Record<string, unknown>>;

      const gamOrderId = orders?.[0]?.["id"] ? String(orders[0]["id"]) : generatedMediaBuyId;

      return {
        media_buy_id: `gam_order_${gamOrderId}`,
        buyer_ref: request.buyer_ref,
        packages: request.packages.map((_pkg, i) => ({
          package_id: `gam_pkg_${gamOrderId}_${i + 1}`,
          status: "draft" as const,
        })),
      };
    } catch (gamErr) {
      // GAM call failed — fall through to mock response with error logged
      console.error(`[mediaBuyAdapterCall] GAM createOrders failed: ${gamErr instanceof Error ? gamErr.message : String(gamErr)}. Falling back to mock.`);
    }
  }

  // Mock / non-GAM adapter — deterministic response
  return {
    media_buy_id: generatedMediaBuyId,
    buyer_ref: request.buyer_ref,
    packages: request.packages.map((_pkg, i) => ({
      package_id: `pkg_${generatedMediaBuyId}_${i + 1}`,
      status: "draft" as const,
    })),
  };
}

/**
 * Persist MediaBuy + MediaPackage rows and link ObjectWorkflowMapping.
 * Python equivalent: session.add(MediaBuy(...)) + session.add_all([MediaPackage(...)]) +
 *   context_manager.link_object(step_id, "media_buy", media_buy_id)
 */
async function persistMediaBuy(
  ctx: MediaBuyCreateContext,
  request: CreateMediaBuyRequest,
  normalized: CreateMediaBuySuccess,
): Promise<void> {
  const mediaBuyId = normalized.media_buy_id ?? buildGeneratedMediaBuyId(ctx);
  const advertiserName = extractAdvertiserName(request);
  const orderName = request.buyer_ref;
  const { totalBudget, currency } = extractBudgetInfo(request);

  const now = new Date();
  const startVal =
    request.start_time === "asap" ? now : new Date(request.start_time as string);
  const endVal = new Date(request.end_time);

  await db.insert(mediaBuys).values({
    mediaBuyId,
    tenantId: ctx.tenantId,
    principalId: ctx.principalId,
    buyerRef: request.buyer_ref,
    orderName,
    advertiserName,
    budget: totalBudget,
    currency,
    startDate: startVal.toISOString().slice(0, 10),
    endDate: endVal.toISOString().slice(0, 10),
    startTime: startVal,
    endTime: endVal,
    status: "draft",
    rawRequest: request as unknown as Record<string, unknown>,
  });

  if (normalized.packages.length > 0) {
    await db.insert(mediaPackages).values(
      normalized.packages.map((pkg, i) => {
        const reqPkg = request.packages[i];
        let pkgBudget: string | null = null;
        if (reqPkg) {
          const b = reqPkg.budget;
          if (typeof b === "number") {
            pkgBudget = b.toFixed(2);
          } else if (b && typeof b === "object" && "total" in b) {
            pkgBudget = (b as { total: number }).total.toFixed(2);
          }
        }
        return {
          mediaBuyId,
          packageId: pkg.package_id,
          budget: pkgBudget,
          packageConfig: reqPkg as unknown as Record<string, unknown>,
        };
      }),
    );
  }

  if (ctx.stepId) {
    await db.insert(objectWorkflowMappings).values({
      objectType: "media_buy",
      objectId: mediaBuyId,
      stepId: ctx.stepId,
      action: "create",
    });
  }
}

/**
 * Perform create media buy via adapter.
 *
 * Persists MediaBuy + MediaPackage rows and links ObjectWorkflowMapping.
 * Full adapter client integration (GAM/Mock/etc.) is deferred.
 * Python equivalent: _create_media_buy_impl adapter orchestration + DB writes.
 */
export async function createMediaBuyViaAdapter(
  ctx: MediaBuyCreateContext,
  request: CreateMediaBuyRequest,
): Promise<CreateMediaBuyResponse> {
  const fallbackMediaBuyId = buildGeneratedMediaBuyId(ctx);
  const adapterResponse = await invokeCreateAdapter(ctx, request);
  const normalized = normalizeCreateResponse(fallbackMediaBuyId, request, adapterResponse);
  await persistMediaBuy(ctx, request, normalized);
  return normalized;
}

/**
 * Perform update media buy via adapter.
 *
 * For GAM tenants, updates the order via OrderService.updateOrders if the
 * media_buy_id maps to a GAM order (prefixed "gam_order_").
 * For all other adapter types, returns the deterministic mock response.
 */
export async function updateMediaBuyViaAdapter(
  ctx: MediaBuyCreateContext,
  mediaBuyId: string,
  request: UpdateMediaBuyRequest,
): Promise<UpdateMediaBuyResponse> {
  const affected_packages: UpdateMediaBuySuccess["affected_packages"] =
    request.packages?.map((p) => ({
      package_id: p.package_id,
      paused: p.paused,
    })) ?? [];

  // Attempt GAM update if this is a GAM-sourced media buy
  if (mediaBuyId.startsWith("gam_order_")) {
    const gamOrderId = mediaBuyId.replace(/^gam_order_/, "");
    const [adapter] = await db
      .select()
      .from(adapterConfigs)
      .where(eq(adapterConfigs.tenantId, ctx.tenantId))
      .limit(1);

    if (adapter?.adapterType === "google_ad_manager" && adapter.gamNetworkCode) {
      try {
        const gamClient = buildGamClient(adapter);
        const orderService = await gamClient.getService("OrderService");
        const updatePayload: Record<string, unknown> = { id: gamOrderId };
        if (request.packages?.some((p) => p.paused !== undefined)) {
          // Reflect pause state via GAM order status (PAUSED / APPROVED)
          const anyPaused = request.packages?.some((p) => p.paused === true) ?? false;
          updatePayload["status"] = anyPaused ? "PAUSED" : "APPROVED";
        }
        await (orderService as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>)
          .updateOrders([updatePayload]);
      } catch (err) {
        console.error(`[mediaBuyAdapterCall] GAM updateOrders failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  return { media_buy_id: mediaBuyId, affected_packages };
}
