import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Alert, Box, Button, Card, CardContent, Chip, Collapse,
  Divider, Stack, Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { BaseLayout } from "../components/BaseLayout";
import { PrivateRoute } from "../components/PrivateRoute";
import { useAuth } from "../context/AuthContext";

interface CreativeItem {
  creative_id: string;
  name: string;
  format: string;
  status: string;
  principal_name: string;
  principal_id: string;
  group_id: string | null;
  data: Record<string, unknown> | null;
  created_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  media_buys: Array<{ media_buy_id: string; order_name: string; status: string }>;
}

interface ReviewPageData {
  tenant_id: string;
  tenant_name: string;
  creatives: CreativeItem[];
  has_ai_review: boolean;
  approval_mode: string | null;
}

// ── Creative Preview ─────────────────────────────────────────────────────────

function inferAssetType(format: string, assetUrl: string): "image" | "video" | "audio" | "html" | "unknown" {
  const f = format.toLowerCase();
  const u = assetUrl.toLowerCase();
  if (f.includes("video") || f.includes("vast") || /\.(mp4|webm|mov)$/.test(u)) return "video";
  if (f.includes("audio") || /\.(mp3|aac|m4a|wav)$/.test(u)) return "audio";
  if (f.includes("html") || /\.(html|htm)$/.test(u)) return "html";
  if (/\.(jpg|jpeg|png|gif|webp|avif|svg)$/.test(u)) return "image";
  if (f.includes("image") || f.includes("banner") || f.includes("display")) return "image";
  return "unknown";
}

function CreativePreview({ creative }: { creative: CreativeItem }) {
  const assetUrl = typeof creative.data?.asset_url === "string" ? creative.data.asset_url : null;
  const clickUrl = typeof creative.data?.click_url === "string" ? creative.data.click_url : null;

  if (!assetUrl) {
    return (
      <Box sx={{ p: 2, background: "rgba(0,0,0,0.2)", borderRadius: 1, textAlign: "center" }}>
        <Typography variant="caption" color="text.secondary">No asset URL — synced via MCP</Typography>
        <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mt: 0.5, fontFamily: "monospace", fontSize: "0.7rem" }}>
          Format: {creative.format}
        </Typography>
      </Box>
    );
  }

  const type = inferAssetType(creative.format, assetUrl);

  return (
    <Box sx={{ mt: 1.5 }}>
      <Box sx={{ background: "rgba(0,0,0,0.3)", borderRadius: 1, p: 1, overflow: "hidden", display: "flex", justifyContent: "center", alignItems: "center", minHeight: 80 }}>
        {type === "image" && (
          <img
            src={assetUrl}
            alt={creative.name}
            style={{ maxWidth: "100%", maxHeight: 300, objectFit: "contain", borderRadius: 4 }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}
        {type === "video" && (
          <video
            src={assetUrl}
            controls
            style={{ maxWidth: "100%", maxHeight: 300, borderRadius: 4 }}
          />
        )}
        {type === "audio" && (
          <audio src={assetUrl} controls style={{ width: "100%" }} />
        )}
        {type === "html" && (
          <iframe
            src={assetUrl}
            title={creative.name}
            sandbox="allow-scripts"
            style={{ border: "none", width: "100%", height: 250, borderRadius: 4, background: "#fff" }}
          />
        )}
        {type === "unknown" && (
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="caption" color="text.secondary">Preview not available for this format</Typography>
            <Typography variant="caption" sx={{ display: "block", color: "primary.main", fontSize: "0.75rem", mt: 0.5 }}>
              <a href={assetUrl} target="_blank" rel="noopener noreferrer" style={{ color: "inherit" }}>Open asset ↗</a>
            </Typography>
          </Box>
        )}
      </Box>
      <Stack direction="row" gap={1} mt={1} flexWrap="wrap">
        <Typography variant="caption" sx={{ color: "text.secondary", fontFamily: "monospace", fontSize: "0.7rem", wordBreak: "break-all" }}>
          {assetUrl}
        </Typography>
        <Button size="small" href={assetUrl} target="_blank" rel="noopener noreferrer" sx={{ fontSize: "0.7rem", p: 0, minWidth: 0, color: "primary.main" }}>
          Open ↗
        </Button>
        {clickUrl && (
          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem" }}>
            Click → <a href={clickUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#00d4ff" }}>{clickUrl}</a>
          </Typography>
        )}
      </Stack>
    </Box>
  );
}

// ── Review Card ──────────────────────────────────────────────────────────────

function ReviewCard({
  creative, onApprove, onReject, onAiReview, loading, hasAiReview,
}: {
  creative: CreativeItem;
  onApprove: () => void;
  onReject: () => void;
  onAiReview: () => void;
  loading: boolean;
  hasAiReview: boolean;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <Card sx={{ mb: 2, border: "1px solid rgba(245,158,11,0.25)" }}>
      <CardContent>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
              <Typography variant="subtitle1" fontWeight={700}>{creative.name}</Typography>
              <Chip label={creative.format} size="small" variant="outlined" sx={{ fontSize: "0.65rem" }} />
              <Chip label={creative.status.replace(/_/g, " ")} size="small" color="warning" sx={{ fontSize: "0.65rem" }} />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {creative.principal_name}
              {creative.created_at && ` · ${new Date(creative.created_at).toLocaleDateString()}`}
              {creative.media_buys.length > 0 && ` · ${creative.media_buys.length} campaign${creative.media_buys.length > 1 ? "s" : ""}`}
            </Typography>
          </Box>
          <Button size="small" onClick={() => setExpanded((p) => !p)} sx={{ minWidth: 0, color: "text.secondary" }}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </Button>
        </Stack>

        <Collapse in={expanded}>
          <CreativePreview creative={creative} />

          <Divider sx={{ my: 1.5 }} />

          <Stack direction="row" gap={1} flexWrap="wrap">
            <Button
              variant="contained"
              color="success"
              size="small"
              startIcon={<CheckCircleIcon />}
              disabled={loading}
              onClick={onApprove}
            >
              Approve
            </Button>
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<CancelIcon />}
              disabled={loading}
              onClick={onReject}
            >
              Reject
            </Button>
            {hasAiReview && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<SmartToyIcon />}
                disabled={loading}
                onClick={onAiReview}
                sx={{ borderColor: "rgba(124,58,237,0.5)", color: "#a855f7" }}
              >
                AI Review
              </Button>
            )}
          </Stack>
        </Collapse>
      </CardContent>
    </Card>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

function CreativesReviewContent() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [data, setData] = useState<ReviewPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/tenant/${id}/creatives/review`, { credentials: "include" });
      if (!res.ok) { setError(res.status === 401 ? "Unauthorized" : "Failed to load"); return; }
      setData((await res.json()) as ReviewPageData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const approve = async (creativeId: string) => {
    if (!id) return;
    setActionLoading(creativeId);
    try {
      const res = await fetch(`/tenant/${id}/creatives/review/${encodeURIComponent(creativeId)}/approve`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved_by: user ?? undefined }),
      });
      if (res.ok) await load(); else setError("Approve failed");
    } finally { setActionLoading(null); }
  };

  const reject = async (creativeId: string) => {
    if (!id) return;
    const reason = window.prompt("Rejection reason (required):");
    if (reason == null || !reason.trim()) return;
    setActionLoading(creativeId);
    try {
      const res = await fetch(`/tenant/${id}/creatives/review/${encodeURIComponent(creativeId)}/reject`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejected_by: user ?? undefined, rejection_reason: reason.trim() }),
      });
      if (res.ok) await load(); else setError("Reject failed");
    } finally { setActionLoading(null); }
  };

  const aiReview = async (creativeId: string) => {
    if (!id) return;
    setActionLoading(creativeId);
    try {
      const res = await fetch(`/tenant/${id}/creatives/review/${encodeURIComponent(creativeId)}/ai-review`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) await load(); else setError("AI review failed");
    } finally { setActionLoading(null); }
  };

  if (!id) return null;
  if (loading) return <BaseLayout tenantId={id}><p>Loading…</p></BaseLayout>;
  if (error && !data) return <BaseLayout tenantId={id}><p style={{ color: "crimson" }}>{error}</p></BaseLayout>;
  if (!data) return null;

  const pending = data.creatives.filter((c) => c.status === "pending_review" || c.status === "pending");

  return (
    <BaseLayout tenantId={id} tenantName={data.tenant_name}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1}>
        <Typography variant="h5" fontWeight={700}>Creative Review</Typography>
        <Stack direction="row" gap={1}>
          <Link to={`/tenant/${id}/creatives/list`} style={{ color: "#00d4ff", fontSize: "0.875rem" }}>All creatives</Link>
          <Link to={`/tenant/${id}/creatives/add`} style={{ color: "#00d4ff", fontSize: "0.875rem" }}>+ Upload</Link>
        </Stack>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

      {pending.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 6 }}>
          <CheckCircleIcon sx={{ fontSize: 48, color: "success.main", mb: 1 }} />
          <Typography color="text.secondary">No pending creatives — all clear!</Typography>
        </Box>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {pending.length} creative{pending.length > 1 ? "s" : ""} pending review
          </Typography>
          {pending.map((c) => (
            <ReviewCard
              key={c.creative_id}
              creative={c}
              loading={actionLoading === c.creative_id}
              hasAiReview={data.has_ai_review}
              onApprove={() => { void approve(c.creative_id); }}
              onReject={() => { void reject(c.creative_id); }}
              onAiReview={() => { void aiReview(c.creative_id); }}
            />
          ))}
        </>
      )}

      <Typography variant="caption" color="text.secondary">
        Total: {data.creatives.length} · Pending: {pending.length}
      </Typography>
    </BaseLayout>
  );
}

export default function CreativesReviewPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <PrivateRoute requireAuth requireTenantAccess tenantId={id}>
      <CreativesReviewContent />
    </PrivateRoute>
  );
}
