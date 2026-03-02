import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
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
  created_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
}

interface ReviewPageData {
  tenant_id: string;
  tenant_name: string;
  creatives: CreativeItem[];
  has_ai_review: boolean;
  approval_mode: string | null;
}

/**
 * List pending creatives; approve/reject/ai-review actions.
 * GET /tenant/:id/creatives/review; POST .../review/:creativeId/approve|reject|ai-review.
 */
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
      if (!res.ok) {
        setError(res.status === 401 ? "Unauthorized" : "Failed to load");
        return;
      }
      const json = (await res.json()) as ReviewPageData;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (creativeId: string) => {
    if (!id) return;
    setActionLoading(creativeId);
    try {
      const res = await fetch(`/tenant/${id}/creatives/review/${encodeURIComponent(creativeId)}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ approved_by: user ?? undefined }),
      });
      if (res.ok) await load();
      else setError("Approve failed");
    } finally {
      setActionLoading(null);
    }
  };

  const reject = async (creativeId: string) => {
    if (!id) return;
    const reason = window.prompt("Rejection reason (required):");
    if (reason == null || !reason.trim()) return;
    setActionLoading(creativeId);
    try {
      const res = await fetch(`/tenant/${id}/creatives/review/${encodeURIComponent(creativeId)}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rejected_by: user ?? undefined, rejection_reason: reason.trim() }),
      });
      if (res.ok) await load();
      else setError("Reject failed");
    } finally {
      setActionLoading(null);
    }
  };

  const aiReview = async (creativeId: string) => {
    if (!id) return;
    setActionLoading(creativeId);
    try {
      const res = await fetch(`/tenant/${id}/creatives/review/${encodeURIComponent(creativeId)}/ai-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      if (res.ok) await load();
      else setError("AI review failed");
    } finally {
      setActionLoading(null);
    }
  };

  if (!id) return null;
  if (loading) return <BaseLayout tenantId={id}><p>Loading…</p></BaseLayout>;
  if (error && !data) return <BaseLayout tenantId={id}><p style={{ color: "crimson" }}>{error}</p></BaseLayout>;
  if (!data) return null;

  const pending = data.creatives.filter((c) => c.status === "pending_review" || c.status === "pending");

  return (
    <BaseLayout tenantId={id} tenantName={data.tenant_name}>
      <h1 style={{ fontFamily: "system-ui" }}>Creatives review</h1>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {pending.length === 0 ? (
        <p style={{ color: "#666" }}>No pending creatives.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {pending.map((c) => (
            <li
              key={c.creative_id}
              style={{
                border: "1px solid #eee",
                borderRadius: 4,
                padding: "0.75rem",
                marginBottom: "0.5rem",
              }}
            >
              <div><strong>{c.name}</strong> — {c.format} · {c.principal_name}</div>
              <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => approve(c.creative_id)}
                  disabled={actionLoading === c.creative_id}
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => reject(c.creative_id)}
                  disabled={actionLoading === c.creative_id}
                >
                  Reject
                </button>
                {data.has_ai_review && (
                  <button
                    type="button"
                    onClick={() => aiReview(c.creative_id)}
                    disabled={actionLoading === c.creative_id}
                  >
                    AI review
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <p style={{ marginTop: "1rem" }}>
        Total creatives: {data.creatives.length} · Pending: {pending.length}
      </p>
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
