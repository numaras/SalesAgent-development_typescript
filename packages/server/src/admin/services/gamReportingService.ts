import { and, eq } from "drizzle-orm";

import { db } from "../../db/client.js";
import { gamInventory, gamLineItems, gamOrders } from "../../db/schema/gamInventory.js";

export type ReportingDateRange = "lifetime" | "this_month" | "today";

export interface ReportingFilters {
  tenantId: string;
  dateRange: ReportingDateRange;
  advertiserId?: string;
  orderId?: string;
  lineItemId?: string;
  timezone: string;
}

export interface BaseReportingRow {
  timestamp: string;
  impressions: number;
  spend: number;
  clicks: number;
  advertiser_id: string | null;
  advertiser_name: string | null;
  order_id: string;
  order_name: string;
  line_item_id: string;
  line_item_name: string;
}

export interface CountryBreakdownRow {
  country: string;
  impressions: number;
  spend: number;
  avg_cpm: number;
  ctr: number;
}

export interface AdUnitBreakdownRow {
  ad_unit_id: string;
  ad_unit_name: string;
  impressions: number;
  spend: number;
  avg_cpm: number;
}

export interface AdvertiserSummary {
  advertiser_id: string;
  total_impressions: number;
  total_spend: number;
  avg_cpm: number;
}

interface LineItemComputed {
  lineItemId: string;
  lineItemName: string;
  orderId: string;
  orderName: string;
  advertiserId: string | null;
  advertiserName: string | null;
  timestamp: Date;
  impressions: number;
  clicks: number;
  spend: number;
  countries: string[];
  adUnitIds: string[];
}

function startOfDateRange(dateRange: ReportingDateRange): Date | null {
  const now = new Date();
  if (dateRange === "lifetime") return null;
  if (dateRange === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  const start = new Date(now);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return start;
}

function extractNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  return null;
}

function extractSpendFromDeliveryData(deliveryData: Record<string, unknown> | null | undefined): number | null {
  if (!deliveryData) return null;

  const directCandidates: unknown[] = [
    deliveryData["spend"],
    deliveryData["totalSpend"],
    deliveryData["cost"],
    deliveryData["revenue"],
  ];
  for (const candidate of directCandidates) {
    const n = extractNumber(candidate);
    if (n != null) return n;
  }

  const nested = deliveryData["budget"] as Record<string, unknown> | undefined;
  if (nested) {
    const micros = extractNumber(nested["amountMicros"] ?? nested["microAmount"]);
    if (micros != null) return micros / 1_000_000;
    const amount = extractNumber(nested["amount"]);
    if (amount != null) return amount;
  }

  return null;
}

function estimateSpendFromRate(
  costType: string | null | undefined,
  costPerUnitMicros: number | null | undefined,
  impressions: number,
  clicks: number,
): number {
  if (costPerUnitMicros == null) return 0;
  const rate = costPerUnitMicros / 1_000_000;
  const ct = (costType ?? "").toUpperCase();
  if (ct.includes("CPM")) return (impressions / 1000) * rate;
  if (ct.includes("CPC")) return clicks * rate;
  if (ct.includes("CPD")) return rate;
  return 0;
}

function extractCountries(targeting: Record<string, unknown> | null | undefined): string[] {
  if (!targeting) return [];
  const out = new Set<string>();

  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (!value || typeof value !== "object") return;
    const rec = value as Record<string, unknown>;

    const code = rec["countryCode"] ?? rec["code"] ?? rec["country"];
    if (typeof code === "string" && code.trim().length >= 2 && code.trim().length <= 3) {
      out.add(code.trim().toUpperCase());
    }

    for (const child of Object.values(rec)) {
      if (typeof child === "object" && child !== null) visit(child);
      if (Array.isArray(child)) visit(child);
    }
  };

  visit(targeting["geoTargeting"] ?? targeting["geo"] ?? targeting);
  return [...out];
}

function extractAdUnitIds(targeting: Record<string, unknown> | null | undefined): string[] {
  if (!targeting) return [];
  const out = new Set<string>();

  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (!value || typeof value !== "object") return;
    const rec = value as Record<string, unknown>;

    const possibleIds: unknown[] = [
      rec["adUnitId"],
      rec["ad_unit_id"],
      rec["inventoryId"],
      rec["id"],
    ];
    for (const raw of possibleIds) {
      if (typeof raw === "string" && /^\d+$/.test(raw.trim())) out.add(raw.trim());
      if (typeof raw === "number" && Number.isFinite(raw)) out.add(String(Math.trunc(raw)));
    }

    for (const child of Object.values(rec)) {
      if (typeof child === "object" && child !== null) visit(child);
      if (Array.isArray(child)) visit(child);
    }
  };

  visit(targeting["inventoryTargeting"] ?? targeting["inventory"] ?? targeting);
  return [...out];
}

function buildLineItemComputed(
  item: typeof gamLineItems.$inferSelect,
  order: typeof gamOrders.$inferSelect | undefined,
): LineItemComputed {
  const impressions = item.statsImpressions ?? 0;
  const clicks = item.statsClicks ?? 0;
  const spendFromData = extractSpendFromDeliveryData(item.deliveryData ?? null);
  const spend =
    spendFromData ??
    estimateSpendFromRate(item.costType, item.costPerUnit, impressions, clicks);
  const timestamp =
    item.lastModifiedDate ??
    item.lastSynced ??
    item.updatedAt ??
    item.creationDate ??
    new Date();

  return {
    lineItemId: item.lineItemId,
    lineItemName: item.name,
    orderId: item.orderId,
    orderName: order?.name ?? item.orderId,
    advertiserId: order?.advertiserId ?? null,
    advertiserName: order?.advertiserName ?? null,
    timestamp,
    impressions,
    clicks,
    spend,
    countries: extractCountries(item.targeting ?? null),
    adUnitIds: extractAdUnitIds(item.targeting ?? null),
  };
}

async function loadFilteredLineItems(filters: ReportingFilters): Promise<LineItemComputed[]> {
  const [lineItems, orders] = await Promise.all([
    db
      .select()
      .from(gamLineItems)
      .where(eq(gamLineItems.tenantId, filters.tenantId)),
    db
      .select()
      .from(gamOrders)
      .where(eq(gamOrders.tenantId, filters.tenantId)),
  ]);

  const ordersById = new Map(orders.map((o) => [o.orderId, o]));
  const start = startOfDateRange(filters.dateRange);

  return lineItems
    .map((li) => buildLineItemComputed(li, ordersById.get(li.orderId)))
    .filter((row) => {
      if (start && row.timestamp < start) return false;
      if (filters.advertiserId && row.advertiserId !== filters.advertiserId) return false;
      if (filters.orderId && row.orderId !== filters.orderId) return false;
      if (filters.lineItemId && row.lineItemId !== filters.lineItemId) return false;
      return true;
    });
}

export async function getBaseReportingRows(filters: ReportingFilters): Promise<BaseReportingRow[]> {
  const rows = await loadFilteredLineItems(filters);
  return rows
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    .map((r) => ({
      timestamp: r.timestamp.toISOString(),
      impressions: r.impressions,
      spend: Number(r.spend.toFixed(6)),
      clicks: r.clicks,
      advertiser_id: r.advertiserId,
      advertiser_name: r.advertiserName,
      order_id: r.orderId,
      order_name: r.orderName,
      line_item_id: r.lineItemId,
      line_item_name: r.lineItemName,
    }));
}

export async function getCountryBreakdown(filters: ReportingFilters): Promise<CountryBreakdownRow[]> {
  const rows = await loadFilteredLineItems(filters);
  const totals = new Map<string, { impressions: number; clicks: number; spend: number }>();

  for (const row of rows) {
    const countries = row.countries.length ? row.countries : ["UNKNOWN"];
    const weight = 1 / countries.length;
    for (const country of countries) {
      const prev = totals.get(country) ?? { impressions: 0, clicks: 0, spend: 0 };
      prev.impressions += row.impressions * weight;
      prev.clicks += row.clicks * weight;
      prev.spend += row.spend * weight;
      totals.set(country, prev);
    }
  }

  return [...totals.entries()]
    .map(([country, v]) => {
      const avgCpm = v.impressions > 0 ? (v.spend / v.impressions) * 1000 : 0;
      const ctr = v.impressions > 0 ? v.clicks / v.impressions : 0;
      return {
        country,
        impressions: Math.round(v.impressions),
        spend: Number(v.spend.toFixed(6)),
        avg_cpm: Number(avgCpm.toFixed(6)),
        ctr: Number(ctr.toFixed(6)),
      };
    })
    .sort((a, b) => b.spend - a.spend);
}

export async function getAdUnitBreakdown(filters: ReportingFilters): Promise<AdUnitBreakdownRow[]> {
  const [rows, adUnits] = await Promise.all([
    loadFilteredLineItems(filters),
    db
      .select({ inventoryId: gamInventory.inventoryId, name: gamInventory.name })
      .from(gamInventory)
      .where(and(eq(gamInventory.tenantId, filters.tenantId), eq(gamInventory.inventoryType, "ad_unit"))),
  ]);

  const adUnitNameById = new Map(adUnits.map((a) => [a.inventoryId, a.name]));
  const totals = new Map<string, { impressions: number; spend: number }>();

  for (const row of rows) {
    const adUnitIds = row.adUnitIds.length ? row.adUnitIds : ["unknown"];
    const weight = 1 / adUnitIds.length;
    for (const adUnitId of adUnitIds) {
      const prev = totals.get(adUnitId) ?? { impressions: 0, spend: 0 };
      prev.impressions += row.impressions * weight;
      prev.spend += row.spend * weight;
      totals.set(adUnitId, prev);
    }
  }

  return [...totals.entries()]
    .map(([adUnitId, v]) => {
      const avgCpm = v.impressions > 0 ? (v.spend / v.impressions) * 1000 : 0;
      return {
        ad_unit_id: adUnitId,
        ad_unit_name: adUnitNameById.get(adUnitId) ?? `Ad Unit ${adUnitId}`,
        impressions: Math.round(v.impressions),
        spend: Number(v.spend.toFixed(6)),
        avg_cpm: Number(avgCpm.toFixed(6)),
      };
    })
    .sort((a, b) => b.spend - a.spend);
}

export async function getAdvertiserSummary(filters: ReportingFilters & { advertiserId: string }): Promise<AdvertiserSummary> {
  const rows = await loadFilteredLineItems(filters);
  const totalImpressions = rows.reduce((sum, row) => sum + row.impressions, 0);
  const totalSpend = rows.reduce((sum, row) => sum + row.spend, 0);
  const avgCpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;

  return {
    advertiser_id: filters.advertiserId,
    total_impressions: totalImpressions,
    total_spend: Number(totalSpend.toFixed(6)),
    avg_cpm: Number(avgCpm.toFixed(6)),
  };
}
