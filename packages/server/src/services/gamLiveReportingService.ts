import { eq } from "drizzle-orm";

import { db } from "../db/client.js";
import { adapterConfigs } from "../db/schema/adapterConfigs.js";
import { buildGamClient } from "../gam/gamClient.js";
import type {
  AdUnitBreakdownRow,
  AdvertiserSummary,
  BaseReportingRow,
  CountryBreakdownRow,
  ReportingDateRange,
} from "../admin/services/gamReportingService.js";

interface LiveReportingFilters {
  tenantId: string;
  dateRange: ReportingDateRange;
  advertiserId?: string;
  orderId?: string;
  lineItemId?: string;
}

function toGamDate(d: Date): { year: number; month: number; day: number } {
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

function getDateRange(dateRange: ReportingDateRange): { startDate: Date; endDate: Date } {
  const now = new Date();
  const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (dateRange === "today") {
    return { startDate: endDate, endDate };
  }
  if (dateRange === "this_month") {
    const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    return { startDate, endDate };
  }
  return { startDate: new Date(Date.UTC(2010, 0, 1)), endDate };
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === "\"") {
      if (inQuotes && line[i + 1] === "\"") {
        cur += "\"";
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

function parseCsvDump(csv: string): Array<Record<string, string>> {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0] ?? "");
  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i] ?? "");
    const rec: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c] ?? `col_${c}`;
      rec[key] = values[c] ?? "";
    }
    rows.push(rec);
  }
  return rows;
}

function parseIntLike(raw: string | undefined): number {
  if (!raw) return 0;
  const normalized = raw.replace(/[^\d.-]/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function parseRevenueMicros(raw: string | undefined): number {
  if (!raw) return 0;
  const normalized = raw.replace(/[^\d.-]/g, "");
  const micros = Number(normalized);
  return Number.isFinite(micros) ? micros / 1_000_000 : 0;
}

function buildStatement(filters: LiveReportingFilters): string {
  const clauses: string[] = [];
  if (filters.advertiserId) clauses.push(`ADVERTISER_ID = ${filters.advertiserId}`);
  if (filters.orderId) clauses.push(`ORDER_ID = ${filters.orderId}`);
  if (filters.lineItemId) clauses.push(`LINE_ITEM_ID = ${filters.lineItemId}`);
  if (clauses.length === 0) return "";
  return `WHERE ${clauses.join(" AND ")}`;
}

type GenericCsvRow = Record<string, string>;

function parseCsvKey(row: GenericCsvRow, key: string): string {
  return row[`Dimension.${key}`] ?? row[key] ?? "";
}

async function runLiveReport(
  filters: LiveReportingFilters,
  dimensions: string[],
): Promise<GenericCsvRow[]> {
  const [adapter] = await db
    .select()
    .from(adapterConfigs)
    .where(eq(adapterConfigs.tenantId, filters.tenantId))
    .limit(1);
  if (!adapter) {
    throw new Error("Adapter config not found");
  }

  const client = buildGamClient(adapter);
  const reportService = await client.getService("ReportService");
  const { startDate, endDate } = getDateRange(filters.dateRange);

  const reportJob = await (reportService as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>)
    .runReportJob({
      id: 0,
      reportQuery: {
        dimensions,
        adUnitView: "TOP_LEVEL",
        columns: [
          "AD_SERVER_IMPRESSIONS",
          "AD_SERVER_CLICKS",
          "AD_SERVER_ALL_REVENUE",
        ],
        dimensionAttributes: [],
        customFieldIds: [],
        cmsMetadataKeyIds: [],
        customDimensionKeyIds: [],
        startDate: toGamDate(startDate),
        endDate: toGamDate(endDate),
        dateRangeType: "CUSTOM_DATE",
        statement: { query: buildStatement(filters) },
        adxReportCurrency: "",
        timeZoneType: "PUBLISHER",
      },
    }) as Record<string, unknown>;

  const reportJobId = Number(reportJob["id"]);
  if (!Number.isFinite(reportJobId) || reportJobId <= 0) {
    throw new Error("Invalid GAM report job id");
  }

  const maxPolls = 30;
  for (let i = 0; i < maxPolls; i++) {
    const status = String(
      await (reportService as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>)
        .getReportJobStatus(reportJobId),
    );
    if (status === "COMPLETED") break;
    if (status === "FAILED") {
      throw new Error(`GAM report job ${reportJobId} failed`);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
    if (i === maxPolls - 1) {
      throw new Error(`Timed out waiting for GAM report job ${reportJobId}`);
    }
  }

  const downloadUrl = await (reportService as unknown as Record<string, (...a: unknown[]) => Promise<string>>)
    .getReportDownloadUrlWithOptions(reportJobId, {
      exportFormat: "CSV_DUMP",
      useGzipCompression: false,
      includeReportProperties: false,
      includeTotalsRow: false,
    });

  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed downloading GAM report (HTTP ${response.status})`);
  }
  const csv = await response.text();
  return parseCsvDump(csv);
}

export async function fetchLiveGamBaseReportingRows(
  filters: LiveReportingFilters,
): Promise<BaseReportingRow[]> {
  const includeHour = filters.dateRange === "today";
  const csvRows = await runLiveReport(
    filters,
    includeHour
      ? ["DATE", "HOUR", "ADVERTISER_ID", "ADVERTISER_NAME", "ORDER_ID", "ORDER_NAME", "LINE_ITEM_ID", "LINE_ITEM_NAME"]
      : ["DATE", "ADVERTISER_ID", "ADVERTISER_NAME", "ORDER_ID", "ORDER_NAME", "LINE_ITEM_ID", "LINE_ITEM_NAME"],
  );

  return csvRows.map((row) => {
    const dateStr = parseCsvKey(row, "DATE");
    const hourRaw = parseCsvKey(row, "HOUR");
    const hour = hourRaw ? Math.max(0, Math.min(23, parseIntLike(hourRaw))) : 0;
    const timestamp = dateStr
      ? new Date(`${dateStr}T${String(hour).padStart(2, "0")}:00:00.000Z`).toISOString()
      : new Date().toISOString();

    const impressions = parseIntLike(row["Column.AD_SERVER_IMPRESSIONS"] ?? row["AD_SERVER_IMPRESSIONS"]);
    const clicks = parseIntLike(row["Column.AD_SERVER_CLICKS"] ?? row["AD_SERVER_CLICKS"]);
    const spend = parseRevenueMicros(row["Column.AD_SERVER_ALL_REVENUE"] ?? row["AD_SERVER_ALL_REVENUE"]);

    return {
      timestamp,
      impressions,
      clicks,
      spend: Number(spend.toFixed(6)),
      advertiser_id: parseCsvKey(row, "ADVERTISER_ID") || null,
      advertiser_name: parseCsvKey(row, "ADVERTISER_NAME") || null,
      order_id: parseCsvKey(row, "ORDER_ID"),
      order_name: parseCsvKey(row, "ORDER_NAME"),
      line_item_id: parseCsvKey(row, "LINE_ITEM_ID"),
      line_item_name: parseCsvKey(row, "LINE_ITEM_NAME"),
    };
  });
}

export async function fetchLiveGamCountryBreakdown(
  filters: LiveReportingFilters,
): Promise<CountryBreakdownRow[]> {
  const csvRows = await runLiveReport(filters, ["COUNTRY_NAME"]);
  const byCountry = new Map<string, { impressions: number; clicks: number; spend: number }>();

  for (const row of csvRows) {
    const country = parseCsvKey(row, "COUNTRY_NAME") || "Unknown";
    const impressions = parseIntLike(row["Column.AD_SERVER_IMPRESSIONS"] ?? row["AD_SERVER_IMPRESSIONS"]);
    const clicks = parseIntLike(row["Column.AD_SERVER_CLICKS"] ?? row["AD_SERVER_CLICKS"]);
    const spend = parseRevenueMicros(row["Column.AD_SERVER_ALL_REVENUE"] ?? row["AD_SERVER_ALL_REVENUE"]);
    const curr = byCountry.get(country) ?? { impressions: 0, clicks: 0, spend: 0 };
    curr.impressions += impressions;
    curr.clicks += clicks;
    curr.spend += spend;
    byCountry.set(country, curr);
  }

  return [...byCountry.entries()]
    .map(([country, v]) => ({
      country,
      impressions: v.impressions,
      spend: Number(v.spend.toFixed(6)),
      avg_cpm: v.impressions > 0 ? Number(((v.spend / v.impressions) * 1000).toFixed(6)) : 0,
      ctr: v.impressions > 0 ? Number(((v.clicks / v.impressions) * 100).toFixed(6)) : 0,
    }))
    .sort((a, b) => b.impressions - a.impressions);
}

export async function fetchLiveGamAdUnitBreakdown(
  filters: LiveReportingFilters,
): Promise<AdUnitBreakdownRow[]> {
  const csvRows = await runLiveReport(filters, ["AD_UNIT_ID", "AD_UNIT_NAME"]);
  const byAdUnit = new Map<string, { ad_unit_name: string; impressions: number; spend: number }>();

  for (const row of csvRows) {
    const adUnitId = parseCsvKey(row, "AD_UNIT_ID");
    if (!adUnitId) continue;
    const adUnitName = parseCsvKey(row, "AD_UNIT_NAME");
    const impressions = parseIntLike(row["Column.AD_SERVER_IMPRESSIONS"] ?? row["AD_SERVER_IMPRESSIONS"]);
    const spend = parseRevenueMicros(row["Column.AD_SERVER_ALL_REVENUE"] ?? row["AD_SERVER_ALL_REVENUE"]);
    const curr = byAdUnit.get(adUnitId) ?? { ad_unit_name: adUnitName, impressions: 0, spend: 0 };
    curr.impressions += impressions;
    curr.spend += spend;
    if (!curr.ad_unit_name && adUnitName) curr.ad_unit_name = adUnitName;
    byAdUnit.set(adUnitId, curr);
  }

  return [...byAdUnit.entries()]
    .map(([ad_unit_id, v]) => ({
      ad_unit_id,
      ad_unit_name: v.ad_unit_name || ad_unit_id,
      impressions: v.impressions,
      spend: Number(v.spend.toFixed(6)),
      avg_cpm: v.impressions > 0 ? Number(((v.spend / v.impressions) * 1000).toFixed(6)) : 0,
    }))
    .sort((a, b) => b.impressions - a.impressions);
}

export async function fetchLiveGamAdvertiserSummary(
  filters: LiveReportingFilters & { advertiserId: string },
): Promise<AdvertiserSummary> {
  const rows = await fetchLiveGamBaseReportingRows(filters);
  const totalImpressions = rows.reduce((sum, row) => sum + row.impressions, 0);
  const totalSpend = rows.reduce((sum, row) => sum + row.spend, 0);
  return {
    advertiser_id: filters.advertiserId,
    total_impressions: totalImpressions,
    total_spend: Number(totalSpend.toFixed(6)),
    avg_cpm: totalImpressions > 0 ? Number(((totalSpend / totalImpressions) * 1000).toFixed(6)) : 0,
  };
}
