import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BaseLayout } from "../components/BaseLayout";
import { PrivateRoute } from "../components/PrivateRoute";
import {
  Box, Card, CardContent, Chip, CircularProgress, Grid,
  IconButton, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Tooltip, Typography,
} from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import SettingsIcon from "@mui/icons-material/Settings";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import GroupIcon from "@mui/icons-material/Group";
import InventoryIcon from "@mui/icons-material/Inventory";
import TerminalIcon from "@mui/icons-material/Terminal";

type RevenuePeriod = "7d" | "30d" | "90d";

interface DashboardMetrics {
  live_buys: number;
  total_revenue: number;
  total_advertisers: number;
  products_count: number;
  needs_attention?: number;
  active_advertisers?: number;
  revenue_change?: number;
  revenue_change_abs?: number;
  scheduled_buys?: number;
  needs_creatives?: number;
  needs_approval?: number;
}

interface MediaBuy {
  media_buy_id: string;
  order_name: string | null;
  advertiser_name: string | null;
  buyer_ref?: string | null;
  status: string;
  readiness_state?: string;
  budget: string | number | null;
  currency?: string | null;
  spend?: number | null;
  created_at: string;
  created_at_relative?: string;
}

interface DashboardData {
  tenant_id: string;
  tenant: { tenant_id: string; name: string; is_active: boolean; ad_server?: string };
  metrics: DashboardMetrics;
  recent_media_buys: MediaBuy[];
}

interface RevenueChartData {
  labels: string[];
  values: number[];
}

const STATUS_CONFIG: Record<string, { color: "success" | "info" | "warning" | "error" | "default"; label: string }> = {
  live:            { color: "success", label: "LIVE" },
  scheduled:       { color: "info",    label: "SCHEDULED" },
  needs_creatives: { color: "warning", label: "NEEDS CREATIVES" },
  needs_approval:  { color: "warning", label: "NEEDS APPROVAL" },
  completed:       { color: "default", label: "COMPLETED" },
  failed:          { color: "error",   label: "FAILED" },
  paused:          { color: "default", label: "PAUSED" },
  draft:           { color: "default", label: "DRAFT" },
};

function StatusChip({ status }: { status: string }) {
  const key = (status ?? "").toLowerCase().replace(/\s+/g, "_");
  const cfg = STATUS_CONFIG[key] ?? { color: "default" as const, label: status.toUpperCase().replace(/_/g, " ") };
  return (
    <Chip
      label={cfg.label}
      color={cfg.color}
      size="small"
      sx={{ fontWeight: 700, fontSize: "0.65rem", letterSpacing: "0.06em", height: 20 }}
    />
  );
}

function RevenueBarChart({ labels, values, loading }: RevenueChartData & { loading: boolean }) {
  if (loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: 140 }}>
        <CircularProgress size={28} color="primary" />
      </Box>
    );
  }
  if (!labels.length) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: 140 }}>
        <Typography variant="body2" color="text.secondary">No data for this period.</Typography>
      </Box>
    );
  }
  const max = Math.max(...values, 1);
  const chartH = 120;
  const barW = Math.min(40, Math.max(8, Math.floor(560 / labels.length) - 4));
  const gap = Math.max(2, Math.floor(560 / labels.length) - barW);
  const totalW = labels.length * (barW + gap);
  return (
    <Box sx={{ overflowX: "auto" }}>
      <svg width={Math.max(totalW, 120)} height={chartH + 36} style={{ display: "block" }}>
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0077b6" stopOpacity="0.5" />
          </linearGradient>
        </defs>
        {values.map((val, i) => {
          const barH = Math.max(2, Math.round((val / max) * chartH));
          const x = i * (barW + gap);
          const y = chartH - barH;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH} fill="url(#barGrad)" rx={2} />
              <rect x={x} y={y} width={barW} height={1} fill="#00d4ff" opacity={0.8} />
              <text x={x + barW / 2} y={chartH + 16} textAnchor="middle" fontSize={9} fill="#4a7a9b">
                {labels[i]?.slice(-8) ?? ""}
              </text>
              {barH > 18 && (
                <text x={x + barW / 2} y={y + 11} textAnchor="middle" fontSize={8} fill="#c8d8f0" fontWeight="bold">
                  ${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </Box>
  );
}

interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: React.ReactNode;
  icon: React.ReactNode;
  accentColor?: string;
  to?: string;
}

function MetricCard({ label, value, sub, icon, accentColor = "#00d4ff", to }: MetricCardProps) {
  const card = (
    <Card
      sx={{
        height: "100%",
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "2px",
          background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
        },
      }}
    >
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Box>
            <Typography
              variant="overline"
              sx={{ color: "text.secondary", fontSize: "0.65rem", letterSpacing: "0.1em", lineHeight: 1.4, display: "block" }}
            >
              {label}
            </Typography>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                color: "text.primary",
                fontFamily: '"Roboto Mono", monospace',
                fontSize: "1.75rem",
                lineHeight: 1.2,
                mt: 0.25,
              }}
            >
              {value}
            </Typography>
            {sub && <Box sx={{ mt: 0.5 }}>{sub}</Box>}
          </Box>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 1.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: `${accentColor}18`,
              border: `1px solid ${accentColor}30`,
              color: accentColor,
              "& svg": { fontSize: 20 },
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (to) {
    return (
      <Box
        component={Link}
        to={to}
        sx={{ textDecoration: "none", display: "block", height: "100%" }}
      >
        {card}
      </Box>
    );
  }
  return card;
}

// ---------------------------------------------------------------------------
// Background Process Logs tile
// ---------------------------------------------------------------------------

type LogLevel = "debug" | "info" | "warn" | "error";

interface ProcessLogEntry {
  ts: string;
  level: LogLevel;
  process: string;
  tenantId?: string;
  message: string;
  meta?: Record<string, unknown>;
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: "#6b7a8d",
  info: "#00d4ff",
  warn: "#f59e0b",
  error: "#ff4560",
};

const LEVEL_BG: Record<LogLevel, string> = {
  debug: "rgba(107,122,141,0.12)",
  info: "rgba(0,212,255,0.10)",
  warn: "rgba(245,158,11,0.12)",
  error: "rgba(255,69,96,0.12)",
};

function formatLogTime(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toTimeString().slice(0, 8);
  } catch {
    return ts;
  }
}

function LogLine({ entry, expanded, onToggle }: { entry: ProcessLogEntry; expanded: boolean; onToggle: () => void }) {
  const color = LEVEL_COLORS[entry.level] ?? "#6b7a8d";
  const bg = LEVEL_BG[entry.level] ?? "transparent";
  const hasMeta = entry.meta && Object.keys(entry.meta).length > 0;

  return (
    <Box
      onClick={hasMeta ? onToggle : undefined}
      sx={{
        px: 1.5,
        py: 0.4,
        display: "flex",
        flexDirection: "column",
        gap: 0,
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        cursor: hasMeta ? "pointer" : "default",
        bgcolor: expanded ? bg : "transparent",
        "&:hover": { bgcolor: bg },
        transition: "background 0.1s",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, flexWrap: "wrap" }}>
        <Typography
          component="span"
          sx={{ fontFamily: "monospace", fontSize: "0.68rem", color: "text.disabled", flexShrink: 0, minWidth: 60 }}
        >
          {formatLogTime(entry.ts)}
        </Typography>
        <Box
          sx={{
            px: 0.6,
            py: 0,
            borderRadius: 0.5,
            bgcolor: `${color}20`,
            border: `1px solid ${color}40`,
            flexShrink: 0,
          }}
        >
          <Typography component="span" sx={{ fontFamily: "monospace", fontSize: "0.6rem", color, fontWeight: 700, letterSpacing: "0.06em" }}>
            {entry.level.toUpperCase()}
          </Typography>
        </Box>
        <Box
          sx={{
            px: 0.6,
            py: 0,
            borderRadius: 0.5,
            bgcolor: "rgba(255,255,255,0.05)",
            flexShrink: 0,
          }}
        >
          <Typography component="span" sx={{ fontFamily: "monospace", fontSize: "0.6rem", color: "text.secondary" }}>
            {entry.process}
          </Typography>
        </Box>
        <Typography
          component="span"
          sx={{ fontFamily: "monospace", fontSize: "0.72rem", color: "text.primary", wordBreak: "break-word", flex: 1 }}
        >
          {entry.message}
        </Typography>
        {hasMeta && (
          <Typography component="span" sx={{ fontSize: "0.6rem", color: "text.disabled", flexShrink: 0 }}>
            {expanded ? "▲" : "▼"}
          </Typography>
        )}
      </Box>
      {expanded && hasMeta && (
        <Box
          sx={{
            mt: 0.5,
            ml: 9,
            p: 1,
            borderRadius: 1,
            bgcolor: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <Typography
            component="pre"
            sx={{ fontFamily: "monospace", fontSize: "0.65rem", color: "#a8c7e0", m: 0, whiteSpace: "pre-wrap", wordBreak: "break-all" }}
          >
            {JSON.stringify(entry.meta, null, 2)}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

type SseStatus = "connecting" | "connected" | "error" | "closed";
type LevelFilter = "ALL" | "DEBUG" | "INFO" | "WARN" | "ERROR";

function ProcessLogsTile({ tenantId }: { tenantId: string }) {
  const [logs, setLogs] = useState<ProcessLogEntry[]>([]);
  const [filter, setFilter] = useState<LevelFilter>("ALL");
  const [autoScroll, setAutoScroll] = useState(true);
  const [status, setStatus] = useState<SseStatus>("connecting");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(autoScroll);
  autoScrollRef.current = autoScroll;

  useEffect(() => {
    const es = new EventSource(`/tenant/${tenantId}/process-logs/stream`, { withCredentials: true });

    es.onopen = () => setStatus("connected");

    es.onmessage = (e: MessageEvent<string>) => {
      try {
        const entry = JSON.parse(e.data) as ProcessLogEntry & { type?: string };
        if (entry.type === "connected" || entry.type === "error") return;
        setLogs((prev) => {
          const next = [...prev, entry];
          return next.length > 500 ? next.slice(-500) : next;
        });
      } catch {
        // malformed entry — ignore
      }
    };

    es.onerror = () => {
      setStatus((prev) => (prev === "connected" ? "error" : prev));
    };

    return () => {
      es.close();
      setStatus("closed");
    };
  }, [tenantId]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScrollRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const filtered = filter === "ALL" ? logs : logs.filter((l) => l.level === filter.toLowerCase());

  const statusColor = status === "connected" ? "#00e5a0" : status === "error" ? "#ff4560" : "#f59e0b";
  const statusLabel = status === "connected" ? "LIVE" : status === "error" ? "ERROR" : status === "closed" ? "CLOSED" : "CONNECTING…";

  return (
    <Paper sx={{ overflow: "hidden" }}>
      {/* Header */}
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <TerminalIcon sx={{ fontSize: 16, color: "text.secondary" }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Background Process Logs
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                bgcolor: statusColor,
                boxShadow: status === "connected" ? `0 0 6px ${statusColor}` : "none",
              }}
            />
            <Typography variant="caption" sx={{ color: statusColor, fontWeight: 700, fontSize: "0.6rem" }}>
              {statusLabel}
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: "text.disabled", fontSize: "0.65rem" }}>
            {filtered.length} entries
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
          {/* Level filter */}
          {(["ALL", "DEBUG", "INFO", "WARN", "ERROR"] as LevelFilter[]).map((lvl) => {
            const lvlColor = lvl === "ALL" ? "#6b7a8d" : LEVEL_COLORS[lvl.toLowerCase() as LogLevel];
            const active = filter === lvl;
            return (
              <Chip
                key={lvl}
                label={lvl}
                size="small"
                onClick={() => setFilter(lvl)}
                sx={{
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: "0.6rem",
                  height: 20,
                  bgcolor: active ? `${lvlColor}20` : "transparent",
                  color: active ? lvlColor : "text.disabled",
                  border: "1px solid",
                  borderColor: active ? lvlColor : "divider",
                }}
              />
            );
          })}

          {/* Auto-scroll toggle */}
          <Tooltip title={autoScroll ? "Auto-scroll ON" : "Auto-scroll OFF"}>
            <Chip
              label="AUTO"
              size="small"
              onClick={() => setAutoScroll((v) => !v)}
              sx={{
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "0.6rem",
                height: 20,
                bgcolor: autoScroll ? "rgba(0,212,255,0.10)" : "transparent",
                color: autoScroll ? "#00d4ff" : "text.disabled",
                border: "1px solid",
                borderColor: autoScroll ? "#00d4ff" : "divider",
              }}
            />
          </Tooltip>

          {/* Clear display */}
          <Tooltip title="Clear display">
            <Chip
              label="CLEAR"
              size="small"
              onClick={() => { setLogs([]); setExpandedIdx(null); }}
              sx={{
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "0.6rem",
                height: 20,
                bgcolor: "transparent",
                color: "text.disabled",
                border: "1px solid",
                borderColor: "divider",
                "&:hover": { borderColor: "#ff4560", color: "#ff4560" },
              }}
            />
          </Tooltip>
        </Box>
      </Box>

      {/* Log output */}
      <Box
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
          if (atBottom !== autoScroll) setAutoScroll(atBottom);
        }}
        sx={{
          maxHeight: 360,
          overflowY: "auto",
          bgcolor: "rgba(0,0,0,0.25)",
          "&::-webkit-scrollbar": { width: 4 },
          "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
          "&::-webkit-scrollbar-thumb": { bgcolor: "rgba(255,255,255,0.1)", borderRadius: 2 },
        }}
      >
        {filtered.length === 0 ? (
          <Box sx={{ p: 3, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Typography variant="body2" sx={{ color: "text.disabled", fontFamily: "monospace", fontSize: "0.75rem" }}>
              {status === "connecting" ? "Connecting to log stream…" : "No log entries yet."}
            </Typography>
          </Box>
        ) : (
          filtered.map((entry, i) => (
            <LogLine
              key={i}
              entry={entry}
              expanded={expandedIdx === i}
              onToggle={() => setExpandedIdx((prev) => (prev === i ? null : i))}
            />
          ))
        )}
      </Box>
    </Paper>
  );
}

// ---------------------------------------------------------------------------
// Dashboard content
// ---------------------------------------------------------------------------

function TenantDashboardContent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [revenue, setRevenue] = useState<RevenueChartData | null>(null);
  const [period, setPeriod] = useState<RevenuePeriod>("7d");
  const [loadingRev, setLoadingRev] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [resDash, resRev] = await Promise.all([
          fetch(`/tenant/${id}`, { credentials: "include" }),
          fetch(`/api/tenant/${id}/revenue-chart?period=7d`, { credentials: "include" }),
        ]);
        if (cancelled) return;
        if (!resDash.ok) {
          setError(resDash.status === 401 ? "Unauthorized" : "Failed to load dashboard");
          return;
        }
        setDashboard((await resDash.json()) as DashboardData);
        if (resRev.ok) setRevenue((await resRev.json()) as RevenueChartData);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Request failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  const fetchRevenue = async (p: RevenuePeriod) => {
    if (!id) return;
    setLoadingRev(true);
    try {
      const res = await fetch(`/api/tenant/${id}/revenue-chart?period=${p}`, { credentials: "include" });
      if (res.ok) setRevenue((await res.json()) as RevenueChartData);
    } finally {
      setLoadingRev(false);
    }
  };

  const handlePeriod = (p: RevenuePeriod) => {
    setPeriod(p);
    void fetchRevenue(p);
  };

  if (!id) return null;

  if (loading) {
    return (
      <BaseLayout tenantId={id}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
          <CircularProgress color="primary" />
        </Box>
      </BaseLayout>
    );
  }

  if (error || !dashboard) {
    return (
      <BaseLayout tenantId={id}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
          <Typography color="error">{error ?? "Not found"}</Typography>
        </Box>
      </BaseLayout>
    );
  }

  const { tenant, metrics, recent_media_buys } = dashboard;
  const needsAtten = metrics.needs_attention ?? 0;
  const activeAdv = metrics.active_advertisers ?? metrics.total_advertisers;
  const totalAdv = metrics.total_advertisers;
  const needsCre = metrics.needs_creatives ?? 0;
  const needsApp = metrics.needs_approval ?? 0;
  const revChange = metrics.revenue_change ?? 0;
  const revChangeAbs = metrics.revenue_change_abs ?? 0;

  const attentionLink = `/tenant/${id}/workflows${needsCre > 0 ? "?status=needs_creatives" : needsApp > 0 ? "?status=needs_approval" : ""}`;

  const goToMediaBuy = (mb: MediaBuy) => {
    if (mb.media_buy_id) navigate(`/tenant/${id}/media-buy/${mb.media_buy_id}`);
  };

  return (
    <BaseLayout tenantId={id} tenantName={tenant.name} faviconUrl={null}>
      {/* Page header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3 }}>
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "text.primary" }}>
              {tenant.name}
            </Typography>
            {tenant.is_active && (
              <Chip
                label="ACTIVE"
                size="small"
                color="success"
                sx={{ fontWeight: 700, fontSize: "0.6rem", letterSpacing: "0.08em", height: 18 }}
              />
            )}
          </Box>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Operational Dashboard
            {tenant.ad_server ? ` · ${tenant.ad_server.replace(/_/g, " ").toUpperCase()}` : ""}
          </Typography>
        </Box>
        <Tooltip title="Settings">
          <IconButton component={Link} to={`/tenant/${id}/settings`} size="small" sx={{ color: "text.secondary", border: "1px solid", borderColor: "divider" }}>
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Metric cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} lg>
          <MetricCard
            label="Total Revenue (30d)"
            value={`$${Number(metrics.total_revenue).toLocaleString()}`}
            icon={<MonetizationOnIcon />}
            accentColor="#00d4ff"
            sub={
              revChange !== 0 ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  {revChange > 0
                    ? <TrendingUpIcon sx={{ fontSize: 14, color: "success.main" }} />
                    : <TrendingDownIcon sx={{ fontSize: 14, color: "error.main" }} />}
                  <Typography variant="caption" sx={{ color: revChange > 0 ? "success.main" : "error.main", fontWeight: 600 }}>
                    {revChangeAbs.toFixed(1)}% vs last period
                  </Typography>
                </Box>
              ) : (
                <Typography variant="caption" sx={{ color: "text.secondary" }}>No change</Typography>
              )
            }
          />
        </Grid>
        <Grid item xs={12} sm={6} lg>
          <MetricCard
            label="Live Media Buys"
            value={metrics.live_buys}
            icon={<PlayCircleIcon />}
            accentColor="#00e5a0"
            sub={
              metrics.scheduled_buys
                ? <Typography variant="caption" sx={{ color: "text.secondary" }}>{metrics.scheduled_buys} scheduled</Typography>
                : <Typography variant="caption" sx={{ color: "text.secondary" }}>None scheduled</Typography>
            }
          />
        </Grid>
        <Grid item xs={12} sm={6} lg>
          <MetricCard
            label="Needs Attention"
            value={needsAtten}
            icon={<WarningAmberIcon />}
            accentColor={needsAtten > 0 ? "#ff4560" : "#00e5a0"}
            to={attentionLink}
            sub={
              needsCre > 0
                ? <Typography variant="caption" sx={{ color: "warning.main", fontWeight: 600 }}>{needsCre} need creatives</Typography>
                : needsApp > 0
                ? <Typography variant="caption" sx={{ color: "warning.main", fontWeight: 600 }}>{needsApp} need approval</Typography>
                : <Typography variant="caption" sx={{ color: "success.main", fontWeight: 600 }}>All systems ready</Typography>
            }
          />
        </Grid>
        <Grid item xs={12} sm={6} lg>
          <MetricCard
            label="Active Advertisers"
            value={activeAdv}
            icon={<GroupIcon />}
            accentColor="#a855f7"
            to={`/tenant/${id}/settings`}
            sub={<Typography variant="caption" sx={{ color: "text.secondary" }}>{totalAdv} total registered</Typography>}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg>
          <MetricCard
            label="Products"
            value={metrics.products_count}
            icon={<InventoryIcon />}
            accentColor="#f59e0b"
            to={`/tenant/${id}/products`}
            sub={
              <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 600 }}>
                View all →
              </Typography>
            }
          />
        </Grid>
      </Grid>

      {/* Revenue chart */}
      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: "0.03em" }}>
            Revenue by Advertiser
          </Typography>
          <Box sx={{ display: "flex", gap: 0.5 }}>
            {(["7d", "30d", "90d"] as RevenuePeriod[]).map((p) => (
              <Chip
                key={p}
                label={p === "7d" ? "7D" : p === "30d" ? "30D" : "90D"}
                size="small"
                onClick={() => handlePeriod(p)}
                sx={{
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: "0.65rem",
                  height: 22,
                  bgcolor: period === p ? "rgba(0,212,255,0.15)" : "transparent",
                  color: period === p ? "primary.main" : "text.secondary",
                  border: "1px solid",
                  borderColor: period === p ? "primary.main" : "divider",
                }}
              />
            ))}
          </Box>
        </Box>
        <RevenueBarChart
          labels={revenue?.labels ?? []}
          values={revenue?.values ?? []}
          loading={loadingRev}
        />
      </Paper>

      {/* Media buys + Quick actions */}
      <Grid container spacing={2}>
        {/* Recent media buys */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 0, overflow: "hidden" }}>
            <Box sx={{ px: 2.5, py: 1.75, borderBottom: "1px solid", borderColor: "divider" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Recent Media Buys</Typography>
            </Box>
            {recent_media_buys.length === 0 ? (
              <Box sx={{ p: 3 }}>
                <Typography variant="body2" color="text.secondary">No media buys yet.</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Advertiser</TableCell>
                      <TableCell>Media Buy ID</TableCell>
                      <TableCell>Buyer Ref</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Budget</TableCell>
                      <TableCell align="right">Spend</TableCell>
                      <TableCell>Created</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recent_media_buys.map((mb) => (
                      <TableRow
                        key={mb.media_buy_id}
                        hover
                        onClick={() => goToMediaBuy(mb)}
                        sx={{ cursor: mb.media_buy_id ? "pointer" : "default" }}
                      >
                        <TableCell sx={{ fontWeight: 600, color: "text.primary", py: 1 }}>
                          {mb.advertiser_name ?? "—"}
                        </TableCell>
                        <TableCell sx={{ py: 1 }}>
                          <Typography variant="caption" sx={{ fontFamily: "monospace", color: "text.secondary" }}>
                            {mb.media_buy_id || "N/A"}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1 }}>
                          <Typography variant="caption" sx={{ fontFamily: "monospace", color: "text.secondary" }}>
                            {mb.buyer_ref ?? "—"}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1 }}>
                          <StatusChip status={mb.readiness_state ?? mb.status} />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: "text.primary", fontFamily: "monospace", py: 1, fontSize: "0.8rem" }}>
                          ${Number(mb.budget ?? 0).toLocaleString()} {mb.currency ?? "USD"}
                        </TableCell>
                        <TableCell align="right" sx={{ color: "text.secondary", fontFamily: "monospace", py: 1, fontSize: "0.8rem" }}>
                          ${Number(mb.spend ?? 0).toLocaleString()}
                        </TableCell>
                        <TableCell sx={{ color: "text.secondary", fontSize: "0.75rem", py: 1 }}>
                          {mb.created_at_relative ?? new Date(mb.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>

        {/* Operations panel */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 0, overflow: "hidden" }}>
            <Box sx={{ px: 2.5, py: 1.75, borderBottom: "1px solid", borderColor: "divider" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Operations</Typography>
            </Box>
            <Box sx={{ p: 1.5, display: "flex", flexDirection: "column", gap: 0.75 }}>
              {[
                { to: `/tenant/${id}/creatives/review`, label: "Uploaded Creatives", sub: "View all creatives & media buys", color: "#a855f7" },
                { to: `/tenant/${id}/gam/reporting`,    label: "Reports",             sub: "Performance & delivery data",    color: "#00d4ff" },
                { to: `/tenant/${id}/workflows`,        label: "Workflows",           sub: "Approvals & reviews",            color: "#00e5a0" },
                { to: `/tenant/${id}/settings`,         label: "Webhooks",            sub: "Delivery notifications",         color: "#f59e0b" },
                { to: `/tenant/${id}/settings`,         label: "Settings",            sub: "Products, properties, config",   color: "#6b8ab0" },
              ].map(({ to, label, sub, color }) => (
                <Box
                  key={label}
                  component={Link}
                  to={to}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    p: 1.25,
                    borderRadius: 1,
                    border: "1px solid",
                    borderColor: "divider",
                    textDecoration: "none",
                    color: "inherit",
                    transition: "all 0.15s ease",
                    "&:hover": {
                      borderColor: `${color}50`,
                      bgcolor: `${color}0a`,
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      bgcolor: color,
                      boxShadow: `0 0 6px ${color}`,
                      flexShrink: 0,
                    }}
                  />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary", lineHeight: 1.3 }}>
                      {label}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", lineHeight: 1.3 }}>
                      {sub}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* Background process logs */}
        <Grid item xs={12}>
          <ProcessLogsTile tenantId={id} />
        </Grid>
      </Grid>
    </BaseLayout>
  );
}

export default function TenantDashboard() {
  return (
    <PrivateRoute requireAuth requireTenantAccess tenantId={useParams<{ id: string }>().id}>
      <TenantDashboardContent />
    </PrivateRoute>
  );
}
