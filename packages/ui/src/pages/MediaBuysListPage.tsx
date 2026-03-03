import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Box, Chip, CircularProgress, InputAdornment, MenuItem,
  Paper, Select, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { BaseLayout } from "../components/BaseLayout";
import { PrivateRoute } from "../components/PrivateRoute";

interface MediaBuyItem {
  mediaBuyId: string;
  buyerRef: string | null;
  orderName: string;
  advertiserName: string;
  status: string;
  budget: string | null;
  currency: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string | null;
}

interface MediaBuyEntry {
  media_buy: MediaBuyItem;
  principal_name: string;
  product_names: string[];
  readiness_state: string;
}

interface ListResponse {
  tenant_id: string;
  tenant: { name: string };
  media_buys: MediaBuyEntry[];
}

const STATUS_COLOR: Record<string, "success" | "warning" | "error" | "info" | "default"> = {
  active:           "success",
  approved:         "success",
  scheduled:        "info",
  pending_approval: "warning",
  pending:          "warning",
  draft:            "default",
  paused:           "default",
  completed:        "default",
  failed:           "error",
  rejected:         "error",
};

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function fmtMoney(amount: string | null, currency: string | null) {
  if (!amount) return "—";
  const n = parseFloat(amount);
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currency ?? "USD", maximumFractionDigits: 0 }).format(n);
}

function MediaBuysListContent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/tenant/${id}/media-buys`, { credentials: "include" });
      if (!res.ok) { setError("Failed to load"); return; }
      setData((await res.json()) as ListResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  if (!id) return null;

  if (loading) return (
    <BaseLayout tenantId={id}>
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress color="primary" />
      </Box>
    </BaseLayout>
  );

  if (error || !data) return (
    <BaseLayout tenantId={id}>
      <Typography color="error">{error ?? "No data"}</Typography>
    </BaseLayout>
  );

  const statuses = [...new Set(data.media_buys.map((e) => e.media_buy.status))].sort();

  const filtered = data.media_buys.filter((e) => {
    const m = e.media_buy;
    if (statusFilter && m.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (m.orderName ?? "").toLowerCase().includes(q) ||
        (m.advertiserName ?? "").toLowerCase().includes(q) ||
        (m.buyerRef ?? "").toLowerCase().includes(q) ||
        (m.mediaBuyId ?? "").toLowerCase().includes(q) ||
        e.principal_name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <BaseLayout tenantId={id} tenantName={data.tenant?.name}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={1}>
        <Typography variant="h4" fontWeight={700}>Campaigns</Typography>
        <Typography variant="body2" color="text.secondary">{data.media_buys.length} total</Typography>
      </Stack>
      

      {/* Filters */}
      <Stack direction="row" gap={2} mb={2} flexWrap="wrap">
        <TextField
          size="small"
          placeholder="Search name, advertiser, ref…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 240 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
        <Select
          size="small"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          displayEmpty
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          {statuses.map((s) => (
            <MenuItem key={s} value={s}>{s.replace(/_/g, " ").toUpperCase()}</MenuItem>
          ))}
        </Select>
      </Stack>

      {filtered.length === 0 ? (
        <Typography color="text.secondary" sx={{ mt: 4, textAlign: "center" }}>No campaigns match.</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Campaign</TableCell>
                <TableCell>Advertiser</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Budget</TableCell>
                <TableCell>Flight</TableCell>
                <TableCell>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((entry) => {
                const m = entry.media_buy;
                return (
                  <TableRow
                    key={m.mediaBuyId}
                    onClick={() => navigate(`/tenant/${id}/media-buy/${encodeURIComponent(m.mediaBuyId)}`)}
                    sx={{ cursor: "pointer", "&:hover td": { background: "rgba(0,212,255,0.04)" } }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{m.orderName}</Typography>
                      {m.buyerRef && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace", fontSize: "0.7rem" }}>
                          {m.buyerRef}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{m.advertiserName}</Typography>
                      {entry.principal_name && entry.principal_name !== m.advertiserName && (
                        <Typography variant="caption" color="text.secondary">{entry.principal_name}</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={m.status.replace(/_/g, " ").toUpperCase()}
                        color={STATUS_COLOR[m.status] ?? "default"}
                        size="small"
                        sx={{ fontSize: "0.65rem", fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{fmtMoney(m.budget, m.currency)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {fmt(m.startDate)} → {fmt(m.endDate)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">{fmt(m.createdAt)}</Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </BaseLayout>
  );
}

export default function MediaBuysListPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <PrivateRoute requireAuth requireTenantAccess tenantId={id}>
      <MediaBuysListContent />
    </PrivateRoute>
  );
}
