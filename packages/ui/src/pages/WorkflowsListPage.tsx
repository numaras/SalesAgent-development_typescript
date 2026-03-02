import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BaseLayout } from "../components/BaseLayout";
import { PrivateRoute } from "../components/PrivateRoute";

interface WorkflowStep {
  step_id: string;
  context_id: string;
  step_type: string;
  tool_name: string | null;
  status: string;
  created_at: string | null;
  completed_at: string | null;
  principal_name: string;
  assigned_to: string | null;
  error_message: string | null;
}

interface WorkflowsResponse {
  tenant_id: string;
  tenant_name: string;
  summary: { pending_tasks: number; active_buys: number; total_spend: number };
  workflows: WorkflowStep[];
  tasks: WorkflowStep[];
}

/**
 * List workflow steps; link each to review (GET /tenant/:id/workflows).
 */
function WorkflowsListContent() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<WorkflowsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/tenant/${id}/workflows`, { credentials: "include" });
      if (!res.ok) {
        setError(res.status === 401 ? "Unauthorized" : "Failed to load");
        return;
      }
      const json = (await res.json()) as WorkflowsResponse;
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

  if (!id) return null;
  if (loading) return <BaseLayout tenantId={id}><p>Loading…</p></BaseLayout>;
  if (error) return <BaseLayout tenantId={id}><p style={{ color: "crimson" }}>{error}</p></BaseLayout>;
  if (!data) return <BaseLayout tenantId={id}><p>No data.</p></BaseLayout>;

  const steps = data.tasks ?? data.workflows ?? [];

  return (
    <BaseLayout tenantId={id} tenantName={data.tenant_name}>
      <h1 style={{ fontFamily: "system-ui" }}>Workflow steps</h1>
      {data.summary && (
        <p style={{ color: "#666", marginBottom: "1rem" }}>
          Pending tasks: {data.summary.pending_tasks} · Active buys: {data.summary.active_buys} · Total spend: {data.summary.total_spend}
        </p>
      )}
      {steps.length === 0 ? (
        <p style={{ color: "#666" }}>No workflow steps.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "system-ui" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #eee" }}>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Step</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Type</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Tool</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Status</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Principal</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Created</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Review</th>
            </tr>
          </thead>
          <tbody>
            {steps.map((s) => (
              <tr key={s.step_id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "0.5rem" }}>{s.step_id}</td>
                <td style={{ padding: "0.5rem" }}>{s.step_type}</td>
                <td style={{ padding: "0.5rem" }}>{s.tool_name ?? "—"}</td>
                <td style={{ padding: "0.5rem" }}>{s.status}</td>
                <td style={{ padding: "0.5rem" }}>{s.principal_name}</td>
                <td style={{ padding: "0.5rem" }}>{s.created_at ? new Date(s.created_at).toLocaleString() : "—"}</td>
                <td style={{ padding: "0.5rem" }}>
                  <Link to={`/tenant/${id}/workflows/${s.context_id}/steps/${s.step_id}/review`}>
                    Review
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </BaseLayout>
  );
}

export default function WorkflowsListPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <PrivateRoute requireAuth requireTenantAccess tenantId={id}>
      <WorkflowsListContent />
    </PrivateRoute>
  );
}
