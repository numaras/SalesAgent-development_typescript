import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress,
  Paper, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { BaseLayout } from "../components/BaseLayout";
import { PrivateRoute } from "../components/PrivateRoute";

// ── Types ────────────────────────────────────────────────────────────────────

interface MediaBuy {
  media_buy_id: string;
  buyer_ref: string | null;
  order_name: string;
  advertiser_name: string;
  campaign_objective: string | null;
  kpi_goal: string | null;
  budget: string | null;
  currency: string | null;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
}

interface Principal {
  principal_id: string;
  name: string;
}

interface Package {
  package_id: string;
  media_buy_id: string;
  budget: string | null;
  bid_price: string | null;
  package_config: Record<string, unknown> | null;
}

interface WorkflowStep {
  step_id: string;
  step_type: string;
  tool_name: string | null;
  status: string;
  owner: string;
  created_at: string | null;
  completed_at: string | null;
  error_message: string | null;
}

interface DeliveryMetrics {
  impressions: number;
  spend: number;
  clicks: number | null;
  ctr: number | null;
  currency: string;
}

interface DetailData {
  tenant_id: string;
  media_buy: MediaBuy;
  principal: Principal | null;
  packages: Package[];
  workflow_steps: WorkflowStep[];
  creative_assignments_by_package: Record<string, unknown[]>;
  pending_approval_step: { step_id: string; status: string } | null;
  status_message: { type: string; message: string } | null;
  delivery_metrics: DeliveryMetrics | null;
  computed_state: string;
  readiness: { state: string; is_ready_to_activate: boolean; blocking_issues: string[] };
}

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, "success" | "info" | "warning" | "error" | "default"> = {
  active:           "success",
  approved:         "success",
  draft:            "default",
  pending_approval: "warning",
  pending:          "warning",
  scheduled:        "info",
  paused:           "default",
  completed:        "default",
  failed:           "error",
  rejected:         "error",
};

function StatusChip({ status }: { status: string }) {
  const key = (status ?? "").toLowerCase();
  return (
    <Chip
      label={status.toUpperCase().replace(/_/g, " ")}
      color={STATUS_COLOR[key] ?? "default"}
      size="small"
      sx={{ fontWeight: 700, letterSpacing: "0.05em", fontSize: "0.65rem" }}
    />
  );
}

function fmt(date: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function fmtMoney(amount: string | number | null, currency: string | null): string {
  if (amount == null) return "—";
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currency ?? "USD" }).format(n);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box sx={{ display: "flex", gap: 2, py: 0.75, borderBottom: "1px solid rgba(0,212,255,0.06)" }}>
      <Typography variant="caption" sx={{ color: "text.secondary", minWidth: 160, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", pt: 0.25 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.primary" }}>{value ?? "—"}</Typography>
    </Box>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="overline" sx={{ color: "primary.main", letterSpacing: "0.1em", mb: 1, display: "block" }}>
      {children}
    </Typography>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function MediaBuyDetailContent() {
  const { id, mbId } = useParams<{ id: string; mbId: string }>();
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [activating, setActivating] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!id || !mbId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/tenant/${id}/media-buy/${encodeURIComponent(mbId)}`, { credentials: "include" });
      if (!res.ok) {
        setError(res.status === 404 ? "Campaign not found." : "Failed to load campaign.");
        return;
      }
      setData((await res.json()) as DetailData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [id, mbId]);

  useEffect(() => { void load(); }, [load]);

  const handleActivate = async () => {
    if (!id || !mbId) return;
    setActivating(true);
    setActionMsg(null);
    try {
      const res = await fetch(`/tenant/${id}/media-buy/${encodeURIComponent(mbId)}/activate`, {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string; message?: string };
      if (json.success) {
        setActionMsg({ type: "success", text: json.message ?? "Campaign activated." });
        await load();
      } else {
        setActionMsg({ type: "error", text: json.message ?? json.error ?? "Activation failed." });
      }
    } catch (e) {
      setActionMsg({ type: "error", text: e instanceof Error ? e.message : "Request failed" });
    } finally {
      setActivating(false);
    }
  };

  const handleApprove = async (action: "approve" | "reject") => {
    if (!id || !mbId) return;
    setApproving(true);
    setActionMsg(null);
    try {
      const res = await fetch(`/tenant/${id}/media-buy/${encodeURIComponent(mbId)}/approve`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string; message?: string };
      if (json.success) {
        setActionMsg({ type: "success", text: json.message ?? `Campaign ${action}d.` });
        await load();
      } else {
        setActionMsg({ type: "error", text: json.message ?? json.error ?? "Action failed." });
      }
    } catch (e) {
      setActionMsg({ type: "error", text: e instanceof Error ? e.message : "Request failed" });
    } finally {
      setApproving(false);
    }
  };

  if (!id) return null;

  if (loading) {
    return (
      <BaseLayout tenantId={id}>
        <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
          <CircularProgress color="primary" />
        </Box>
      </BaseLayout>
    );
  }

  if (error || !data) {
    return (
      <BaseLayout tenantId={id}>
        <Alert severity="error" sx={{ mt: 2 }}>{error ?? "No data."}</Alert>
        <Button component={Link} to={`/tenant/${id}`} startIcon={<ArrowBackIcon />} sx={{ mt: 2 }}>
          Back to Dashboard
        </Button>
      </BaseLayout>
    );
  }

  const { media_buy: mb, principal, packages, workflow_steps, delivery_metrics, pending_approval_step, readiness } = data;

  return (
    <BaseLayout tenantId={id}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Button
          component={Link}
          to={`/tenant/${id}`}
          startIcon={<ArrowBackIcon />}
          size="small"
          sx={{ mb: 1.5, color: "text.secondary" }}
        >
          Back to Dashboard
        </Button>
        <Stack direction="row" alignItems="center" gap={2} flexWrap="wrap">
          <Typography variant="h4" sx={{ fontWeight: 700 }}>{mb.order_name}</Typography>
          <StatusChip status={mb.status} />
        </Stack>
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
          {mb.advertiser_name} · {mb.media_buy_id}
        </Typography>
      </Box>

      {/* Approval action message */}
      {actionMsg && (
        <Alert severity={actionMsg.type} onClose={() => setActionMsg(null)} sx={{ mb: 2 }}>
          {actionMsg.text}
        </Alert>
      )}

      {/* Blocking issues */}
      {readiness.blocking_issues.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>Blocking issues:</strong> {readiness.blocking_issues.join(" · ")}
        </Alert>
      )}

      {/* Direct activate for draft/pending campaigns without a workflow step */}
      {!pending_approval_step && ["draft", "pending", "pending_activation", "ready"].includes(mb.status) && (
        <Paper sx={{ p: 2, mb: 3, border: "1px solid rgba(0,212,255,0.3)", background: "rgba(0,212,255,0.04)" }}>
          <Typography variant="subtitle2" sx={{ color: "primary.main", mb: 1 }}>
            This campaign is in <strong>{mb.status}</strong> status. Activate it to start delivery.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<PlayArrowIcon />}
            disabled={activating}
            onClick={handleActivate}
          >
            {activating ? "Activating…" : "Activate Campaign"}
          </Button>
        </Paper>
      )}

      {/* Pending approval actions */}
      {pending_approval_step && (
        <Paper sx={{ p: 2, mb: 3, border: "1px solid rgba(245,158,11,0.4)", background: "rgba(245,158,11,0.06)" }}>
          <Typography variant="subtitle2" sx={{ color: "warning.main", mb: 1 }}>
            This campaign requires approval before it can be activated.
          </Typography>
          <Stack direction="row" gap={1}>
            <Button
              variant="contained"
              color="success"
              size="small"
              startIcon={<CheckCircleIcon />}
              disabled={approving}
              onClick={() => handleApprove("approve")}
            >
              Approve
            </Button>
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<CancelIcon />}
              disabled={approving}
              onClick={() => handleApprove("reject")}
            >
              Reject
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Top row: details + sidebar */}
      <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap", mb: 3 }}>
        {/* Campaign details */}
        <Card sx={{ flex: "1 1 400px" }}>
          <CardContent>
            <SectionTitle>Campaign Details</SectionTitle>
            <DetailRow label="Status" value={<StatusChip status={mb.status} />} />
            <DetailRow label="Advertiser" value={mb.advertiser_name} />
            <DetailRow label="Buyer Ref" value={mb.buyer_ref} />
            <DetailRow label="Objective" value={mb.campaign_objective} />
            <DetailRow label="KPI Goal" value={mb.kpi_goal} />
            <DetailRow label="Budget" value={fmtMoney(mb.budget, mb.currency)} />
            <DetailRow label="Currency" value={mb.currency} />
            <DetailRow label="Start Date" value={fmt(mb.start_date ?? mb.start_time)} />
            <DetailRow label="End Date" value={fmt(mb.end_date ?? mb.end_time)} />
            <DetailRow label="Created" value={fmt(mb.created_at)} />
            {mb.approved_at && <DetailRow label="Approved" value={`${fmt(mb.approved_at)} by ${mb.approved_by ?? "—"}`} />}
          </CardContent>
        </Card>

        {/* Sidebar: principal + delivery */}
        <Box sx={{ flex: "0 1 320px", display: "flex", flexDirection: "column", gap: 2 }}>
          {principal && (
            <Card>
              <CardContent>
                <SectionTitle>Advertiser / Principal</SectionTitle>
                <DetailRow label="Name" value={principal.name} />
                <DetailRow label="ID" value={<Typography variant="caption" sx={{ fontFamily: "monospace" }}>{principal.principal_id}</Typography>} />
              </CardContent>
            </Card>
          )}

          {delivery_metrics && (
            <Card>
              <CardContent>
                <SectionTitle>Delivery Metrics</SectionTitle>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                  {[
                    { label: "Impressions", value: delivery_metrics.impressions.toLocaleString() },
                    { label: "Spend", value: fmtMoney(delivery_metrics.spend, delivery_metrics.currency) },
                    ...(delivery_metrics.clicks != null ? [{ label: "Clicks", value: delivery_metrics.clicks.toLocaleString() }] : []),
                    ...(delivery_metrics.ctr != null ? [{ label: "CTR", value: `${(delivery_metrics.ctr * 100).toFixed(2)}%` }] : []),
                  ].map(({ label, value }) => (
                    <Box key={label} sx={{ flex: "1 1 120px", background: "rgba(0,212,255,0.05)", borderRadius: 1, p: 1.5, textAlign: "center" }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: "primary.main" }}>{value}</Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}
        </Box>
      </Box>

      {/* Packages */}
      {packages.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <SectionTitle>Packages</SectionTitle>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Package ID</TableCell>
                    <TableCell>Budget</TableCell>
                    <TableCell>Bid Price</TableCell>
                    <TableCell>Product</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {packages.map((pkg) => {
                    const cfg = pkg.package_config as Record<string, unknown> | null;
                    const productId = typeof cfg?.["product_id"] === "string" ? cfg["product_id"] : "—";
                    return (
                      <TableRow key={pkg.package_id}>
                        <TableCell><Typography variant="caption" sx={{ fontFamily: "monospace" }}>{pkg.package_id}</Typography></TableCell>
                        <TableCell>{pkg.budget ? fmtMoney(pkg.budget, mb.currency) : "—"}</TableCell>
                        <TableCell>{pkg.bid_price ?? "—"}</TableCell>
                        <TableCell>{productId}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Workflow steps */}
      {workflow_steps.length > 0 && (
        <Card>
          <CardContent>
            <SectionTitle>Workflow History</SectionTitle>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Owner</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Completed</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {workflow_steps.map((step) => (
                    <TableRow key={step.step_id}>
                      <TableCell>{step.step_type}</TableCell>
                      <TableCell><StatusChip status={step.status} /></TableCell>
                      <TableCell>{step.owner}</TableCell>
                      <TableCell>{fmt(step.created_at)}</TableCell>
                      <TableCell>{fmt(step.completed_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </BaseLayout>
  );
}

export default function MediaBuyDetailPage() {
  const { id, mbId } = useParams<{ id: string; mbId: string }>();
  return (
    <PrivateRoute requireAuth requireTenantAccess tenantId={id}>
      <MediaBuyDetailContent key={mbId} />
    </PrivateRoute>
  );
}
