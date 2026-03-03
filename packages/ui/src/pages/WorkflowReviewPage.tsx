import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BaseLayout } from "../components/BaseLayout";
import { PrivateRoute } from "../components/PrivateRoute";

interface StepData {
  step_id: string;
  context_id: string;
  step_type: string;
  tool_name: string | null;
  status: string;
  owner: string | null;
  assigned_to: string | null;
  created_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  request_data?: Record<string, unknown>;
  response_data?: Record<string, unknown>;
  comments: Array<{ user: string; timestamp: string; comment: string }>;
}

interface ReviewResponse {
  tenant_id: string;
  workflow_id: string;
  step: StepData;
  context: { context_id: string; tenant_id: string; principal_id: string | null } | null;
  principal: { principal_id: string; name: string } | null;
  request_data: Record<string, unknown>;
  formatted_request: string;
}

/**
 * Step detail; approve/reject buttons → fetch(...) to server routes.
 * Parity with _legacy/templates/workflow_review.html.
 */
function WorkflowReviewContent() {
  const { id, workflowId, stepId } = useParams<{ id: string; workflowId: string; stepId: string }>();
  const [data, setData] = useState<ReviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id || !workflowId || !stepId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/tenant/${id}/workflows/${workflowId}/steps/${stepId}/review`, {
        credentials: "include",
      });
      if (!res.ok) {
        setError(res.status === 401 ? "Unauthorized" : res.status === 404 ? "Step not found" : "Failed to load");
        return;
      }
      const json = (await res.json()) as ReviewResponse;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [id, workflowId, stepId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async () => {
    if (!id || !workflowId || !stepId || actionBusy || !data) return;
    if (!window.confirm("Approve this workflow step?")) return;
    setActionBusy(true);
    try {
      const res = await fetch(`/tenant/${id}/workflows/${workflowId}/steps/${stepId}/approve`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        await load();
      } else {
        const text = await res.text();
        window.alert(`Failed to approve: ${text}`);
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Request failed");
    } finally {
      setActionBusy(false);
    }
  };

  const handleReject = async () => {
    if (!id || !workflowId || !stepId || actionBusy || !data) return;
    const reason = window.prompt("Reason for rejection:");
    if (reason == null) return;
    setActionBusy(true);
    try {
      const res = await fetch(`/tenant/${id}/workflows/${workflowId}/steps/${stepId}/reject`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || "No reason provided" }),
      });
      if (res.ok) {
        await load();
      } else {
        const text = await res.text();
        window.alert(`Failed to reject: ${text}`);
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Request failed");
    } finally {
      setActionBusy(false);
    }
  };

  if (!id) return null;
  if (loading) return <BaseLayout tenantId={id}><p>Loading…</p></BaseLayout>;
  if (error) return <BaseLayout tenantId={id}><p style={{ color: "crimson" }}>{error}</p></BaseLayout>;
  if (!data) return <BaseLayout tenantId={id}><p>No data.</p></BaseLayout>;

  const step = data.step;
  const canAct = step.status === "requires_approval" || step.status === "pending_approval";

  const card: React.CSSProperties = {
    background: "rgba(13,21,38,0.85)",
    border: "1px solid rgba(0,212,255,0.12)",
    borderRadius: 10,
    padding: "1.5rem",
    marginBottom: "1rem",
  };

  const label: React.CSSProperties = { fontWeight: 600, color: "#4a7a9b", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em" };
  const value: React.CSSProperties = { color: "#dce8f5", margin: 0 };

  const statusColors =
    step.status === "requires_approval" || step.status === "pending_approval"
      ? { background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.35)" }
      : step.status === "approved"
        ? { background: "rgba(0,229,160,0.1)", color: "#00e5a0", border: "1px solid rgba(0,229,160,0.3)" }
        : step.status === "rejected"
          ? { background: "rgba(255,69,96,0.1)", color: "#ff4560", border: "1px solid rgba(255,69,96,0.3)" }
          : { background: "rgba(0,212,255,0.08)", color: "#7da0c0", border: "1px solid rgba(0,212,255,0.15)" };

  const statusLabel =
    step.status === "requires_approval" || step.status === "pending_approval"
      ? "⚠ Requires Your Approval"
      : step.status === "approved" ? "✓ Approved"
      : step.status === "rejected" ? "✗ Rejected"
      : step.status;

  return (
    <BaseLayout tenantId={id}>
      <p style={{ marginBottom: "1rem" }}>
        <Link to={`/tenant/${id}/workflows`} style={{ color: "#00d4ff" }}>← Back to Workflows</Link>
      </p>
      <h1 style={{ marginBottom: "1rem", fontWeight: 700 }}>Workflow Step Review</h1>
      <div style={{ marginBottom: "1.5rem" }}>
        <span style={{ ...statusColors, padding: "0.45rem 1rem", borderRadius: 6, fontWeight: 700, fontSize: "0.875rem" }}>
          {statusLabel}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem" }}>
        <div>
          <section style={card}>
            <h2 style={{ marginTop: 0, fontSize: "1.1rem", color: "#e2e8f0" }}>Request Details</h2>
            <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.6rem 1.5rem", margin: "1rem 0" }}>
              <dt style={label}>Tool</dt><dd style={value}>{step.tool_name ?? "N/A"}</dd>
              <dt style={label}>Step Type</dt><dd style={value}>{step.step_type}</dd>
              <dt style={label}>Created</dt><dd style={value}>{step.created_at ? new Date(step.created_at).toLocaleString() : "N/A"}</dd>
              {data.principal && (
                <><dt style={label}>Requested By</dt><dd style={value}>{data.principal.name}</dd></>
              )}
            </dl>
            <h3 style={{ fontSize: "0.875rem", marginTop: "1.25rem", marginBottom: "0.5rem", ...label }}>Request Payload</h3>
            <pre style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(0,212,255,0.08)", color: "#c8d8f0", padding: "1rem", borderRadius: 6, overflowX: "auto", fontSize: "0.8rem", maxHeight: 400, margin: 0 }}>
              {data.formatted_request || "{}"}
            </pre>
          </section>

          {step.response_data && (
            <section style={card}>
              <h2 style={{ marginTop: 0, fontSize: "1.1rem", color: "#e2e8f0" }}>Response Data</h2>
              <pre style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(0,212,255,0.08)", color: "#c8d8f0", padding: "1rem", borderRadius: 6, overflowX: "auto", fontSize: "0.8rem", maxHeight: 400, margin: 0 }}>
                {JSON.stringify(step.response_data, null, 2)}
              </pre>
            </section>
          )}

          {step.comments && step.comments.length > 0 && (
            <section style={card}>
              <h2 style={{ marginTop: 0, fontSize: "1.1rem", color: "#e2e8f0" }}>Comments</h2>
              {step.comments.map((c, i) => (
                <div key={i} style={{ borderLeft: "3px solid rgba(0,212,255,0.3)", paddingLeft: "1rem", marginBottom: "1rem" }}>
                  <div style={{ fontSize: "0.8rem", color: "#4a7a9b" }}>{c.user} · {c.timestamp}</div>
                  <div style={{ color: "#dce8f5" }}>{c.comment}</div>
                </div>
              ))}
            </section>
          )}
        </div>

        <div>
          {canAct && (
            <div style={card}>
              <h3 style={{ marginTop: 0, color: "#e2e8f0" }}>Take Action</h3>
              <button type="button" onClick={handleApprove} disabled={actionBusy}
                style={{ width: "100%", background: "rgba(0,229,160,0.15)", color: "#00e5a0", border: "1px solid rgba(0,229,160,0.4)", padding: "0.75rem", borderRadius: 6, fontWeight: 700, cursor: "pointer", marginBottom: "0.5rem", fontSize: "0.9rem" }}>
                ✓ Approve
              </button>
              <button type="button" onClick={handleReject} disabled={actionBusy}
                style={{ width: "100%", background: "rgba(255,69,96,0.1)", color: "#ff4560", border: "1px solid rgba(255,69,96,0.35)", padding: "0.75rem", borderRadius: 6, fontWeight: 700, cursor: "pointer", fontSize: "0.9rem" }}>
                ✗ Reject
              </button>
            </div>
          )}
          <div style={{ ...card, marginTop: canAct ? 0 : 0 }}>
            <h3 style={{ marginTop: 0, color: "#e2e8f0", fontSize: "0.95rem" }}>Workflow Context</h3>
            <dl style={{ fontSize: "0.8rem" }}>
              <dt style={{ ...label, marginTop: "0.5rem" }}>Workflow ID</dt>
              <dd style={{ margin: "0.1rem 0 0.5rem 0", fontFamily: "monospace", color: "#7da0c0", wordBreak: "break-all" }}>{data.workflow_id}</dd>
              <dt style={{ ...label, marginTop: "0.5rem" }}>Step ID</dt>
              <dd style={{ margin: "0.1rem 0 0.5rem 0", fontFamily: "monospace", color: "#7da0c0", wordBreak: "break-all" }}>{step.step_id}</dd>
              <dt style={{ ...label, marginTop: "0.5rem" }}>Context ID</dt>
              <dd style={{ margin: "0.1rem 0 0", fontFamily: "monospace", color: "#7da0c0", wordBreak: "break-all" }}>{step.context_id}</dd>
            </dl>
          </div>
        </div>
      </div>
    </BaseLayout>
  );
}

export default function WorkflowReviewPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <PrivateRoute requireAuth requireTenantAccess tenantId={id}>
      <WorkflowReviewContent />
    </PrivateRoute>
  );
}
