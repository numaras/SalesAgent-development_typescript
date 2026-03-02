import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BaseLayout } from "../components/BaseLayout";
import { PrivateRoute } from "../components/PrivateRoute";

type DateRange = "lifetime" | "this_month" | "today";
type AggregateBy = "advertiser" | "country" | "ad_unit" | "order" | "line_item";

interface ReportingMeta {
  start_date?: string;
  end_date?: string;
  requested_timezone?: string;
  data_timezone?: string;
}

interface ReportRow {
  timestamp?: string;
  impressions?: number;
  spend?: number;
  clicks?: number;
  advertiser_id?: string;
  advertiser_name?: string;
  order_id?: string;
  order_name?: string;
  line_item_id?: string;
  line_item_name?: string;
}

interface CountryRow {
  country?: string;
  impressions?: number;
  spend?: number;
  avg_cpm?: number;
  ctr?: number;
}

interface AdUnitRow {
  ad_unit_id?: string;
  ad_unit_name?: string;
  impressions?: number;
  spend?: number;
  avg_cpm?: number;
}

interface AggregatedRow {
  key: string;
  name: string;
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
  cpm: number;
}

function aggregateData(data: ReportRow[], by: AggregateBy): AggregatedRow[] {
  const map: Record<string, { name: string; impressions: number; clicks: number; spend: number }> = {};
  data.forEach((row) => {
    let key: string, name: string;
    switch (by) {
      case "advertiser":
        key = row.advertiser_id ?? "Unknown";
        name = row.advertiser_name ?? `Advertiser ${key}`;
        break;
      case "country":
        key = "all";
        name = "All Countries";
        break;
      case "ad_unit":
        key = "all";
        name = "All Ad Units";
        break;
      case "order":
        key = row.order_id ?? "Unknown";
        name = row.order_name ?? key;
        break;
      case "line_item":
        key = row.line_item_id ?? "Unknown";
        name = row.line_item_name ?? key;
        break;
      default:
        key = "Unknown";
        name = "Unknown";
    }
    if (!map[key]) map[key] = { name, impressions: 0, clicks: 0, spend: 0 };
    map[key].impressions += row.impressions ?? 0;
    map[key].clicks += row.clicks ?? 0;
    map[key].spend += row.spend ?? 0;
  });
  return Object.entries(map)
    .map(([key, v]) => ({
      key,
      name: v.name,
      impressions: v.impressions,
      clicks: v.clicks,
      spend: v.spend,
      ctr: v.impressions > 0 ? (v.clicks / v.impressions) * 100 : 0,
      cpm: v.impressions > 0 ? (v.spend / v.impressions) * 1000 : 0,
    }))
    .sort((a, b) => b.spend - a.spend);
}

function exportCSV(data: ReportRow[], aggregateBy: AggregateBy) {
  const rows = aggregateData(data, aggregateBy);
  const header = [aggregateBy, "Impressions", "Clicks", "CTR", "Spend", "CPM"].join(",");
  const body = rows
    .map((r) =>
      [r.name.replace(/,/g, ";"), r.impressions, r.clicks, r.ctr.toFixed(2), r.spend.toFixed(2), r.cpm.toFixed(2)].join(",")
    )
    .join("\n");
  const blob = new Blob([header + "\n" + body], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gam_report_${aggregateBy}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface TimeSeriesChartProps {
  data: ReportRow[];
}

function TimeSeriesChart({ data }: TimeSeriesChartProps) {
  const byDate: Record<string, { impressions: number; spend: number }> = {};
  data.forEach((row) => {
    if (!row.timestamp) return;
    const date = row.timestamp.split("T")[0];
    if (!byDate[date]) byDate[date] = { impressions: 0, spend: 0 };
    byDate[date].impressions += row.impressions ?? 0;
    byDate[date].spend += row.spend ?? 0;
  });
  const labels = Object.keys(byDate).sort();
  if (labels.length === 0)
    return <p style={{ color: "#7da0c0", fontStyle: "italic" }}>No time series data available.</p>;

  const W = 640, H = 200, PX = 48, PY = 20;
  const innerW = W - PX * 2;
  const innerH = H - PY * 2;
  const maxImp = Math.max(...labels.map((d) => byDate[d].impressions), 1);
  const maxSpend = Math.max(...labels.map((d) => byDate[d].spend), 1);
  const xOf = (i: number) => PX + (labels.length > 1 ? (i / (labels.length - 1)) * innerW : innerW / 2);
  const impPts = labels.map((d, i) => `${xOf(i).toFixed(1)},${(PY + innerH - (byDate[d].impressions / maxImp) * innerH).toFixed(1)}`);
  const spendPts = labels.map((d, i) => `${xOf(i).toFixed(1)},${(PY + innerH - (byDate[d].spend / maxSpend) * innerH).toFixed(1)}`);
  const toPath = (pts: string[]) => pts.map((p, i) => `${i === 0 ? "M" : "L"}${p}`).join(" ");
  const showLabels = labels.length <= 14;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H + (showLabels ? 14 : 0)}`} style={{ maxHeight: 240, fontFamily: "system-ui" }}>
      <line x1={PX} y1={PY} x2={PX} y2={PY + innerH} stroke="rgba(0,212,255,0.2)" />
      <line x1={PX} y1={PY + innerH} x2={W - PX} y2={PY + innerH} stroke="rgba(0,212,255,0.2)" />
      <path d={toPath(impPts)} fill="none" stroke="rgb(75,192,192)" strokeWidth="2" />
      <path d={toPath(spendPts)} fill="none" stroke="rgb(255,99,132)" strokeWidth="2" strokeDasharray="4 2" />
      {showLabels &&
        labels.map((d, i) => (
          <text key={d} x={xOf(i)} y={H + 12} fontSize="9" textAnchor="middle" fill="#7da0c0">
            {d.slice(5)}
          </text>
        ))}
      <text x={PX + 4} y={PY + 12} fontSize="10" fill="#00d4ff">Impr.</text>
      <text x={PX + 4} y={PY + 24} fontSize="10" fill="#ff6b8a">Spend</text>
      <text x={W - PX - 2} y={PY + 12} fontSize="10" textAnchor="end" fill="#7da0c0">
        max {maxImp.toLocaleString()}
      </text>
    </svg>
  );
}

/**
 * Date-range chart; countries/ad-units breakdown.
 * GET /api/tenant/:id/gam/reporting, .../countries, .../ad-units.
 */
function GamReportingContent() {
  const { id } = useParams<{ id: string }>();
  const [dateRange, setDateRange] = useState<DateRange>("this_month");
  const [timezone, setTimezone] = useState("America/New_York");
  const [aggregateBy, setAggregateBy] = useState<AggregateBy>("advertiser");
  const [mainData, setMainData] = useState<ReportRow[]>([]);
  const [countriesData, setCountriesData] = useState<CountryRow[]>([]);
  const [adUnitsData, setAdUnitsData] = useState<AdUnitRow[]>([]);
  const [meta, setMeta] = useState<ReportingMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    const q = `date_range=${dateRange}&timezone=${encodeURIComponent(timezone)}`;
    try {
      const [mainRes, countriesRes, adUnitsRes] = await Promise.all([
        fetch(`/api/tenant/${id}/gam/reporting?${q}`, { credentials: "include" }),
        fetch(`/api/tenant/${id}/gam/reporting/countries?${q}`, { credentials: "include" }),
        fetch(`/api/tenant/${id}/gam/reporting/ad-units?${q}`, { credentials: "include" }),
      ]);

      if (!mainRes.ok) {
        const err = (await mainRes.json().catch(() => ({}))) as { error?: string };
        setError(err.error ?? "GAM reporting unavailable");
        return;
      }

      const mainJson = (await mainRes.json()) as { success?: boolean; data?: ReportRow[]; metadata?: ReportingMeta };
      setMainData(Array.isArray(mainJson.data) ? mainJson.data : []);
      setMeta(mainJson.metadata ?? null);

      if (countriesRes.ok) {
        const cj = (await countriesRes.json()) as { data?: { countries?: CountryRow[] } | CountryRow[] };
        const countries: CountryRow[] = Array.isArray(cj.data)
          ? (cj.data as CountryRow[])
          : ((cj.data as { countries?: CountryRow[] })?.countries ?? []);
        setCountriesData(countries);
      } else {
        setCountriesData([]);
      }

      if (adUnitsRes.ok) {
        const aj = (await adUnitsRes.json()) as { data?: { ad_units?: AdUnitRow[] } | AdUnitRow[] };
        const adUnits: AdUnitRow[] = Array.isArray(aj.data)
          ? (aj.data as AdUnitRow[])
          : ((aj.data as { ad_units?: AdUnitRow[] })?.ad_units ?? []);
        setAdUnitsData(adUnits);
      } else {
        setAdUnitsData([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [id, dateRange, timezone]);

  useEffect(() => {
    load();
  }, [load]);

  // Compute summary stats
  const totals = mainData.reduce<{ impressions: number; spend: number; clicks: number }>(
    (acc, row) => {
      acc.impressions += row.impressions ?? 0;
      acc.spend += row.spend ?? 0;
      acc.clicks += row.clicks ?? 0;
      return acc;
    },
    { impressions: 0, spend: 0, clicks: 0 }
  );
  const avgCpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0;
  const countryCount = countriesData.length;

  const aggregatedRows = aggregateData(mainData, aggregateBy);

  if (!id) return null;
  if (loading && mainData.length === 0 && !meta)
    return (
      <BaseLayout tenantId={id}>
        <p>Loading…</p>
      </BaseLayout>
    );
  if (error)
    return (
      <BaseLayout tenantId={id}>
        <p style={{ color: "crimson" }}>{error}</p>
      </BaseLayout>
    );

  const cardStyle: React.CSSProperties = {
    background: "#0d1526",
    border: "1px solid rgba(0, 212, 255, 0.12)",
    borderRadius: 6,
    padding: "1rem",
    flex: 1,
    minWidth: 130,
  };
  const cardLabelStyle: React.CSSProperties = { fontSize: "0.75rem", color: "#7da0c0", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.08em" };
  const cardValueStyle: React.CSSProperties = { fontSize: "1.5rem", fontWeight: 800, fontFamily: "monospace", color: "#dce8f5" };

  return (
    <BaseLayout tenantId={id}>
      <h1 style={{ fontFamily: "system-ui" }}>GAM reporting</h1>

      {/* Controls bar */}
      <div style={{ marginBottom: "1rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: "0.75rem", color: "#7da0c0", textTransform: "uppercase", letterSpacing: "0.06em" }}>Date range</span>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value as DateRange)}>
            <option value="today">Today (Hourly)</option>
            <option value="this_month">This Month (Daily)</option>
            <option value="lifetime">Lifetime (Daily)</option>
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: "0.75rem", color: "#7da0c0", textTransform: "uppercase", letterSpacing: "0.06em" }}>Timezone</span>
          <select value={timezone} onChange={(e) => setTimezone(e.target.value)} style={{ width: 170 }}>
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
            <option value="UTC">UTC</option>
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: "0.75rem", color: "#7da0c0", textTransform: "uppercase", letterSpacing: "0.06em" }}>Aggregate by</span>
          <select value={aggregateBy} onChange={(e) => setAggregateBy(e.target.value as AggregateBy)}>
            <option value="advertiser">Advertiser</option>
            <option value="country">Country</option>
            <option value="ad_unit">Ad Unit</option>
            <option value="order">Order</option>
            <option value="line_item">Line Item</option>
          </select>
        </label>
        <button
          type="button"
          disabled={mainData.length === 0}
          onClick={() => exportCSV(mainData, aggregateBy)}
          style={{ alignSelf: "flex-end" }}
        >
          Export Data
        </button>
      </div>

      {meta && (
        <p style={{ fontSize: "0.875rem", color: "#666", marginBottom: "1rem" }}>
          {meta.start_date && meta.end_date
            ? `${new Date(meta.start_date).toLocaleDateString()} – ${new Date(meta.end_date).toLocaleDateString()}`
            : ""}
          {meta.requested_timezone ? ` · ${meta.requested_timezone}` : ""}
        </p>
      )}

      {/* Summary cards */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        <div style={cardStyle}>
          <div style={cardLabelStyle}>Total Impressions</div>
          <div style={cardValueStyle}>{totals.impressions.toLocaleString()}</div>
        </div>
        <div style={cardStyle}>
          <div style={cardLabelStyle}>Total Spend</div>
          <div style={cardValueStyle}>${totals.spend.toFixed(2)}</div>
        </div>
        <div style={cardStyle}>
          <div style={cardLabelStyle}>Average CPM</div>
          <div style={cardValueStyle}>${avgCpm.toFixed(2)}</div>
        </div>
        <div style={cardStyle}>
          <div style={cardLabelStyle}>Countries</div>
          <div style={cardValueStyle}>{countryCount > 0 ? countryCount : "—"}</div>
        </div>
      </div>

      {/* Time series chart */}
      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem" }}>Time series (Impressions / Spend)</h2>
        <div style={{ background: "#0d1526", border: "1px solid rgba(0,212,255,0.12)", borderRadius: 6, padding: "0.75rem" }}>
          <TimeSeriesChart data={mainData} />
        </div>
      </section>

      {/* Aggregated table */}
      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem" }}>Overview — by {aggregateBy.replace("_", " ")}</h2>
        {aggregatedRows.length === 0 ? (
          <p style={{ color: "#666" }}>No data for this range.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ background: "rgba(0,212,255,0.04)" }}>
                  <th style={{ textAlign: "left", padding: "0.4rem 0.6rem", borderBottom: "1px solid rgba(0,212,255,0.1)", color: "#7da0c0", fontSize: "0.7rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    {aggregateBy.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </th>
                  <th style={{ textAlign: "right", padding: "0.4rem 0.6rem", borderBottom: "1px solid rgba(0,212,255,0.1)", color: "#7da0c0", fontSize: "0.7rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>Impressions</th>
                  <th style={{ textAlign: "right", padding: "0.4rem 0.6rem", borderBottom: "1px solid rgba(0,212,255,0.1)", color: "#7da0c0", fontSize: "0.7rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>Clicks</th>
                  <th style={{ textAlign: "right", padding: "0.4rem 0.6rem", borderBottom: "1px solid rgba(0,212,255,0.1)", color: "#7da0c0", fontSize: "0.7rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>CTR</th>
                  <th style={{ textAlign: "right", padding: "0.4rem 0.6rem", borderBottom: "1px solid rgba(0,212,255,0.1)", color: "#7da0c0", fontSize: "0.7rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>Spend</th>
                  <th style={{ textAlign: "right", padding: "0.4rem 0.6rem", borderBottom: "1px solid rgba(0,212,255,0.1)", color: "#7da0c0", fontSize: "0.7rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>CPM</th>
                </tr>
              </thead>
              <tbody>
                {aggregatedRows.map((row) => (
                  <tr key={row.key} style={{ borderBottom: "1px solid rgba(0,212,255,0.06)" }}>
                    <td style={{ padding: "0.4rem 0.6rem" }}>{row.name}</td>
                    <td style={{ padding: "0.4rem 0.6rem", textAlign: "right" }}>{row.impressions.toLocaleString()}</td>
                    <td style={{ padding: "0.4rem 0.6rem", textAlign: "right" }}>{row.clicks.toLocaleString()}</td>
                    <td style={{ padding: "0.4rem 0.6rem", textAlign: "right" }}>{row.ctr.toFixed(2)}%</td>
                    <td style={{ padding: "0.4rem 0.6rem", textAlign: "right" }}>${row.spend.toFixed(2)}</td>
                    <td style={{ padding: "0.4rem 0.6rem", textAlign: "right" }}>${row.cpm.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* By country */}
      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem" }}>By country</h2>
        {countriesData.length === 0 ? (
          <p style={{ color: "#666" }}>No country breakdown.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ background: "rgba(0,212,255,0.04)" }}>
                  {["Country","Impressions","Spend","Avg CPM","CTR"].map((h, i) => (
                    <th key={h} style={{ textAlign: i === 0 ? "left" : "right", padding: "0.4rem 0.6rem", borderBottom: "1px solid rgba(0,212,255,0.1)", color: "#7da0c0", fontSize: "0.7rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {countriesData.slice(0, 20).map((c, i) => (
                  <tr key={c.country ?? i} style={{ borderBottom: "1px solid rgba(0,212,255,0.06)" }}>
                    <td style={{ padding: "0.4rem 0.6rem" }}>{c.country ?? "Unknown"}</td>
                    <td style={{ padding: "0.4rem 0.6rem", textAlign: "right" }}>{(c.impressions ?? 0).toLocaleString()}</td>
                    <td style={{ padding: "0.4rem 0.6rem", textAlign: "right" }}>${(c.spend ?? 0).toFixed(2)}</td>
                    <td style={{ padding: "0.4rem 0.6rem", textAlign: "right" }}>${(c.avg_cpm ?? 0).toFixed(2)}</td>
                    <td style={{ padding: "0.4rem 0.6rem", textAlign: "right" }}>{(c.ctr ?? 0).toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* By ad unit */}
      <section>
        <h2 style={{ fontSize: "1rem" }}>By ad unit</h2>
        {adUnitsData.length === 0 ? (
          <p style={{ color: "#666" }}>No ad unit breakdown.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ background: "rgba(0,212,255,0.04)" }}>
                  {["Ad Unit","Impressions","Spend","Avg CPM"].map((h, i) => (
                    <th key={h} style={{ textAlign: i === 0 ? "left" : "right", padding: "0.4rem 0.6rem", borderBottom: "1px solid rgba(0,212,255,0.1)", color: "#7da0c0", fontSize: "0.7rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {adUnitsData.slice(0, 20).map((u, i) => (
                  <tr key={u.ad_unit_id ?? i} style={{ borderBottom: "1px solid rgba(0,212,255,0.06)" }}>
                    <td style={{ padding: "0.4rem 0.6rem" }} title={u.ad_unit_id}>{u.ad_unit_name ?? u.ad_unit_id ?? "Unknown"}</td>
                    <td style={{ padding: "0.4rem 0.6rem", textAlign: "right" }}>{(u.impressions ?? 0).toLocaleString()}</td>
                    <td style={{ padding: "0.4rem 0.6rem", textAlign: "right" }}>${(u.spend ?? 0).toFixed(2)}</td>
                    <td style={{ padding: "0.4rem 0.6rem", textAlign: "right" }}>${(u.avg_cpm ?? 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </BaseLayout>
  );
}

export default function GamReportingPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <PrivateRoute requireAuth requireTenantAccess tenantId={id}>
      <GamReportingContent />
    </PrivateRoute>
  );
}
