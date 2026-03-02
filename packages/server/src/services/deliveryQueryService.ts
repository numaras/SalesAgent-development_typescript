/**
 * Delivery query service: fetch media buys and build get-media-buy-delivery response.
 *
 * Legacy equivalent: _legacy/src/core/tools/media_buy_delivery.py
 *   _get_media_buy_delivery_impl() — batch by media_buy_ids/buyer_refs, status/date filters.
 */
import { and, eq, inArray } from "drizzle-orm";

import { db } from "../db/client.js";
import { mediaBuys, mediaPackages, type MediaBuy } from "../db/schema/mediaBuys.js";
import type {
  GetMediaBuyDeliveryRequest,
  GetMediaBuyDeliveryResponse,
  MediaBuyDeliveryData,
  AggregatedTotals,
  DeliveryTotals,
  PackageDelivery,
  ReportingPeriod,
} from "../schemas/mediaBuyDelivery.js";
import {
  GetMediaBuyDeliveryRequestSchema,
  GetMediaBuyDeliveryResponseSchema,
} from "../schemas/mediaBuyDelivery.js";

export interface DeliveryQueryContext {
  tenantId: string;
  principalId: string;
}

const VALID_STATUSES = ["active", "ready", "paused", "completed", "failed"];

function normalizeRequestedStatus(status: string): string {
  if (status === "pending_activation") {
    return "ready";
  }
  return status;
}

function isValidDate(d: Date): boolean {
  return !Number.isNaN(d.getTime());
}

function parseDateRange(
  startDate?: string,
  endDate?: string,
): { start: Date; end: Date; error?: string } {
  const end = endDate
    ? new Date(endDate + "T23:59:59.999Z")
    : new Date();
  let start: Date;
  if (startDate) {
    start = new Date(startDate + "T00:00:00.000Z");
  } else {
    start = new Date(end);
    start.setDate(start.getDate() - 30);
  }
  if (!isValidDate(start) || !isValidDate(end)) {
    return {
      start: new Date(),
      end: new Date(),
      error: "Invalid date format. Expected YYYY-MM-DD.",
    };
  }
  return { start, end };
}

function statusFromDates(
  referenceDate: Date,
  startDate: Date,
  endDate: Date,
): "ready" | "active" | "completed" {
  const ref = referenceDate.getTime();
  const start = startDate.getTime();
  const end = endDate.getTime();
  if (ref < start) return "ready";
  if (ref > end) return "completed";
  return "active";
}

function toISO(d: Date): string {
  return d.toISOString();
}

/** Structured error response shape matching Python adcp.types.Error. */
type DeliveryError = { code: string; message: string };

function errorResponse(
  errors: DeliveryError[],
  context?: Record<string, unknown>,
): GetMediaBuyDeliveryResponse {
  return GetMediaBuyDeliveryResponseSchema.parse({
    reporting_period: { start: toISO(new Date()), end: toISO(new Date()) },
    currency: "USD",
    aggregated_totals: { impressions: 0, spend: 0, media_buy_count: 0 },
    media_buy_deliveries: [],
    errors,
    context,
  });
}

/**
 * Fetch per-package pricing info for a set of media buy IDs.
 * Returns a map: mediaBuyId → packageId → pricing_info record.
 * Python equivalent: package_pricing_map built in _get_media_buy_delivery_impl L271-279.
 */
async function fetchPackagePricingMap(
  mediaBuyIds: string[],
): Promise<Map<string, Map<string, Record<string, unknown>>>> {
  if (mediaBuyIds.length === 0) return new Map();
  const pkgRows = await db
    .select()
    .from(mediaPackages)
    .where(inArray(mediaPackages.mediaBuyId, mediaBuyIds));

  const result = new Map<string, Map<string, Record<string, unknown>>>();
  for (const row of pkgRows) {
    if (!result.has(row.mediaBuyId)) {
      result.set(row.mediaBuyId, new Map());
    }
    const pkgConfig = (row.packageConfig ?? {}) as Record<string, unknown>;
    const pricingInfo = pkgConfig["pricing_info"] as
      | Record<string, unknown>
      | undefined;
    if (pricingInfo) {
      result.get(row.mediaBuyId)!.set(row.packageId, pricingInfo);
    }
  }
  return result;
}

/**
 * Build per-package delivery entries from raw_request.packages.
 * Python equivalent: _get_media_buy_delivery_impl L282-336.
 *
 * Metrics are divided equally because adapter integration is deferred;
 * pricing_model/rate/currency are populated from MediaPackage.package_config.
 */
function buildPackageDeliveries(
  buy: MediaBuy,
  buyImpressions: number,
  buySpend: number,
  status: "ready" | "active" | "completed",
  pricingMap: Map<string, Record<string, unknown>>,
): PackageDelivery[] {
  const rawRequest = buy.rawRequest as Record<string, unknown> | null;
  if (!rawRequest) return [];

  // AdCP v2.2+ format first; fall back to legacy product_ids
  let packages = (rawRequest["packages"] as Record<string, unknown>[] | undefined) ?? [];
  if (packages.length === 0 && Array.isArray(rawRequest["product_ids"])) {
    packages = (rawRequest["product_ids"] as string[]).map((pid, i) => ({
      product_id: pid,
      package_id: `pkg_${buy.mediaBuyId}_${i + 1}`,
    }));
  }
  if (packages.length === 0) return [];

  const packageCount = packages.length;
  const results: PackageDelivery[] = [];

  packages.forEach((pkg, i) => {
    const packageId =
      (pkg["package_id"] as string | undefined) ??
      `pkg_${pkg["product_id"] ?? "unknown"}_${i}`;

    const pricingInfo = pricingMap.get(packageId);

    const pkgImpressions = buyImpressions / packageCount;
    const pkgSpend = buySpend / packageCount;

    results.push({
      package_id: packageId,
      buyer_ref:
        (pkg["buyer_ref"] as string | undefined) ??
        (rawRequest["buyer_ref"] as string | undefined),
      impressions: pkgImpressions,
      spend: pkgSpend,
      pacing_index: status === "active" ? 1.0 : 0.0,
      pricing_model: pricingInfo
        ? (pricingInfo["pricing_model"] as string | undefined)
        : undefined,
      rate: pricingInfo?.["rate"] != null
        ? parseFloat(pricingInfo["rate"] as string)
        : undefined,
      currency: pricingInfo
        ? (pricingInfo["currency"] as string | undefined)
        : undefined,
    });
  });

  return results;
}

/**
 * Get delivery data for media buys matching the request filters.
 *
 * DB query is tenant+principal scoped; status filter normalises
 * pending_activation→ready; date range defaults to last 30 days.
 *
 * Adapter integration (real per-package metrics) is deferred;
 * package-level delivery is built from raw_request.packages.
 */
export async function getMediaBuyDelivery(
  ctx: DeliveryQueryContext,
  request: GetMediaBuyDeliveryRequest,
): Promise<GetMediaBuyDeliveryResponse> {
  // Auth error: return structured error when principal context is absent.
  // Python equivalent: _get_media_buy_delivery_impl L68-86.
  if (!ctx.principalId) {
    return errorResponse([
      { code: "principal_id_missing", message: "Principal ID not found in context" },
    ], (request as Record<string, unknown>)["context"] as Record<string, unknown> | undefined);
  }

  const parsed = GetMediaBuyDeliveryRequestSchema.parse(request);

  const { start, end, error } = parseDateRange(parsed.start_date, parsed.end_date);
  if (error) {
    return errorResponse(
      [{ code: "invalid_date_format", message: error }],
      parsed.context,
    );
  }
  if (start >= end) {
    return errorResponse(
      [{ code: "invalid_date_range", message: "Start date must be before end date" }],
      parsed.context,
    );
  }

  const referenceDate = end;
  let rows: MediaBuy[];

  const baseWhere = and(
    eq(mediaBuys.tenantId, ctx.tenantId),
    eq(mediaBuys.principalId, ctx.principalId),
  );

  if (parsed.media_buy_ids?.length) {
    const result = await db
      .select()
      .from(mediaBuys)
      .where(and(baseWhere, inArray(mediaBuys.mediaBuyId, parsed.media_buy_ids)));
    rows = result;
  } else if (parsed.buyer_refs?.length) {
    const result = await db
      .select()
      .from(mediaBuys)
      .where(
        and(baseWhere, inArray(mediaBuys.buyerRef, parsed.buyer_refs)),
      );
    rows = result;
  } else {
    const result = await db
      .select()
      .from(mediaBuys)
      .where(baseWhere);
    rows = result;
  }

  const statusFilter: string[] = (() => {
    if (!parsed.status_filter) return ["active"];
    const s = parsed.status_filter;
    if (Array.isArray(s)) {
      return s
        .map((x) => normalizeRequestedStatus(String(x)))
        .filter((x) => VALID_STATUSES.includes(x));
    }
    if (s === "all") return [...VALID_STATUSES];
    const normalized = normalizeRequestedStatus(s);
    return VALID_STATUSES.includes(normalized) ? [normalized] : ["active"];
  })();

  // Fetch per-package pricing info for all matching media buys in one query.
  // Python equivalent: _get_media_buy_delivery_impl L270-279.
  const mediaBuyIds = rows.map((r) => r.mediaBuyId);
  const allPricingMaps = await fetchPackagePricingMap(mediaBuyIds);

  const deliveries: MediaBuyDeliveryData[] = [];
  let totalImpressions = 0;
  let totalSpend = 0;
  let mediaBuyCount = 0;

  for (const buy of rows) {
    const startDate = buy.startTime
      ? new Date(buy.startTime)
      : new Date(buy.startDate);
    const endDate = buy.endTime
      ? new Date(buy.endTime)
      : new Date(buy.endDate);
    const status = statusFromDates(referenceDate, startDate, endDate);
    if (!statusFilter.includes(status)) continue;

    // Adapter integration is deferred — totals remain zeroed until real adapter is wired.
    const buyImpressions = 0;
    const buySpend = 0;

    const totals: DeliveryTotals = {
      impressions: buyImpressions,
      spend: buySpend,
    };

    // Build per-package delivery entries from raw_request + mediaPackage pricing.
    // Python equivalent: _get_media_buy_delivery_impl L282-336.
    const pricingMap = allPricingMaps.get(buy.mediaBuyId) ?? new Map();
    const byPackage = buildPackageDeliveries(
      buy,
      buyImpressions,
      buySpend,
      status,
      pricingMap,
    );

    const delivery: MediaBuyDeliveryData = {
      media_buy_id: buy.mediaBuyId,
      buyer_ref: buy.buyerRef ?? undefined,
      status,
      totals,
      by_package: byPackage,
    };
    deliveries.push(delivery);
    totalImpressions += buyImpressions;
    totalSpend += buySpend;
    mediaBuyCount += 1;
  }

  const reporting_period: ReportingPeriod = {
    start: toISO(start),
    end: toISO(end),
  };
  const aggregated_totals: AggregatedTotals = {
    impressions: totalImpressions,
    spend: totalSpend,
    media_buy_count: mediaBuyCount,
  };

  const response: GetMediaBuyDeliveryResponse = {
    reporting_period,
    currency: "USD",
    aggregated_totals,
    media_buy_deliveries: deliveries,
    context: parsed.context,
  };
  GetMediaBuyDeliveryResponseSchema.parse(response);
  return response;
}
