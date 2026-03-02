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

  const statusStyle =
    step.status === "requires_approval" || step.status === "pending_approval"
      ? { background: "#fef3c7", color: "#92400e" }
      : step.status === "approved"
        ? { background: "#d1fae5", color: "#065f46" }
        : step.status === "rejected"
          ? { background: "#fee2e2", color: "#991b1b" }
          : { background: "#e5e7eb", color: "#374151" };

  return (
    <BaseLayout tenantId={id}>
      <p style={{ marginBottom: "1rem" }}>
        <Link to={`/tenant/${id}`} style={{ color: "var(--link, #06c)" }}>← Back to Dashboard</Link>
      </p>
      <h1 style={{ fontFamily: "system-ui", marginBottom: "1rem" }}>Workflow Step Review</h1>
      <div style={{ marginBottom: "1.5rem" }}>
        <span style={{ ...statusStyle, padding: "0.5rem 1rem", borderRadius: 6, fontWeight: 600 }}>
          {step.status === "requires_approval" || step.status === "pending_approval" ? "⚠️ Requires Your Approval" : step.status === "approved" ? "✓ Approved" : step.status === "rejected" ? "✗ Rejected" : step.status}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem" }}>
        <div>
          <section style={{ background: "#fff", borderRadius: 12, padding: "1.5rem", marginBottom: "1rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h2 style={{ marginTop: 0, fontSize: "1.25rem" }}>Request Details</h2>
            <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.5rem 1rem", margin: "1rem 0" }}>
              <dt style={{ fontWeight: 600, color: "#6b7280" }}>Tool:</dt>
              <dd style={{ margin: 0 }}>{step.tool_name ?? "N/A"}</dd>
              <dt style={{ fontWeight: 600, color: "#6b7280" }}>Step Type:</dt>
              <dd style={{ margin: 0 }}>{step.step_type}</dd>
              <dt style={{ fontWeight: 600, color: "#6b7280" }}>Created:</dt>
              <dd style={{ margin: 0 }}>{step.created_at ? new Date(step.created_at).toLocaleString() : "N/A"}</dd>
              {data.principal && (
                <>
                  <dt style={{ fontWeight: 600, color: "#6b7280" }}>Requested By:</dt>
                  <dd style={{ margin: 0 }}>{data.principal.name} ({data.principal.principal_id})</dd>
                </>
              )}
            </dl>
            <h3 style={{ fontSize: "1rem", marginTop: "1rem", marginBottom: "0.5rem" }}>Request Payload</h3>
            <pre style={{ background: "#f9fafb", padding: "1rem", borderRadius: 6, overflowX: "auto", fontSize: "0.875rem", maxHeight: 400 }}>
              {data.formatted_request || "{}"}
            </pre>
          </section>

          {step.response_data && (
            <section style={{ background: "#fff", borderRadius: 12, padding: "1.5rem", marginBottom: "1rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <h2 style={{ marginTop: 0, fontSize: "1.25rem" }}>Response Data</h2>
              <pre style={{ background: "#f9fafb", padding: "1rem", borderRadius: 6, overflowX: "auto", fontSize: "0.875rem", maxHeight: 400 }}>
                {JSON.stringify(step.response_data, null, 2)}
              </pre>
            </section>
          )}

          {step.comments && step.comments.length > 0 && (
            <section style={{ background: "#fff", borderRadius: 12, padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <h2 style={{ marginTop: 0, fontSize: "1.25rem" }}>Comments</h2>
              {step.comments.map((c, i) => (
                <div key={i} style={{ borderLeft: "3px solid #e5e7eb", paddingLeft: "1rem", marginBottom: "1rem" }}>
                  <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>{c.user} · {c.timestamp}</div>
                  <div>{c.comment}</div>
                </div>
              ))}
            </section>
          )}
        </div>

        <div>
          {canAct && (
            <div style={{ background: "#fff", borderRadius: 12, padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <h3 style={{ marginTop: 0 }}>Take Action</h3>
              <button type="button" onClick={handleApprove} disabled={actionBusy} style={{ width: "100%", background: "#16a34a", color: "white", padding: "0.75rem", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer", marginBottom: "0.5rem" }}>
                ✓ Approve This Step
              </button>
              <button type="button" onClick={handleReject} disabled={actionBusy} style={{ width: "100%", background: "#dc2626", color: "white", padding: "0.75rem", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer" }}>
                ✗ Reject This Step
              </button>
            </div>
          )}
          <div style={{ background: "#fff", borderRadius: 12, padding: "1.5rem", marginTop: "1rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h3 style={{ marginTop: 0 }}>Workflow Context</h3>
            <dl style={{ fontSize: "0.875rem" }}>
              <dt style={{ fontWeight: 600, color: "#6b7280", marginTop: "0.5rem" }}>Workflow ID:</dt>
              <dd style={{ margin: "0 0 0.5rem 0", fontFamily: "monospace", fontSize: "0.75rem" }}>{data.workflow_id}</dd>
              <dt style={{ fontWeight: 600, color: "#6b7280", marginTop: "0.5rem" }}>Step ID:</dt>
              <dd style={{ margin: "0 0 0.5rem 0", fontFamily: "monospace", fontSize: "0.75rem" }}>{step.step_id}</dd>
              <dt style={{ fontWeight: 600, color: "#6b7280", marginTop: "0.5rem" }}>Context ID:</dt>
              <dd style={{ margin: "0 0 0.5rem 0", fontFamily: "monospace", fontSize: "0.75rem" }}>{step.context_id}</dd>
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
