import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { BaseLayout } from "../components/BaseLayout";
import { PrivateRoute } from "../components/PrivateRoute";

interface PrincipalRow {
  principal_id: string;
  name: string;
  access_token: string;
  platform_mappings: Record<string, unknown>;
  media_buy_count: number;
  created_at: string | null;
}

interface ListResponse {
  tenant_id: string;
  principals: PrincipalRow[];
}

type Tab = "list" | "webhooks";

/**
 * List/create/edit/delete principals; webhooks tab.
 * GET /tenant/:id/principals, create/edit/delete; GET /tenant/:id/webhooks for tab.
 */
function PrincipalsContent() {
  const { id, principalId } = useParams<{ id: string; principalId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("list");

  const isCreate = location.pathname.endsWith("/create");
  const isEdit = principalId != null && location.pathname.includes("/edit");
  const showList = !isCreate && !isEdit;

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/tenant/${id}/principals`, { credentials: "include" });
      if (!res.ok) {
        setError(res.status === 401 ? "Unauthorized" : "Failed to load");
        return;
      }
      const json = (await res.json()) as ListResponse;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (showList) load();
  }, [showList, load]);

  const handleDelete = async (pid: string, name: string) => {
    if (!id || !window.confirm(`Delete principal "${name}"?`)) return;
    try {
      const res = await fetch(`/tenant/${id}/principals/${encodeURIComponent(pid)}/delete`, {
        method: "DELETE",
        credentials: "include",
      });
      const result = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (result.success) await load();
      else window.alert(result.error ?? "Delete failed");
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Request failed");
    }
  };

  if (!id) return null;
  if (isCreate) return <PrincipalCreateForm tenantId={id} onSuccess={() => navigate(`/tenant/${id}/principals`)} />;
  if (isEdit && principalId) return <PrincipalEditForm tenantId={id} principalId={principalId} onSuccess={() => navigate(`/tenant/${id}/principals`)} />;

  if (loading) return <BaseLayout tenantId={id}><p>Loading…</p></BaseLayout>;
  if (error) return <BaseLayout tenantId={id}><p style={{ color: "crimson" }}>{error}</p></BaseLayout>;
  if (!data) return <BaseLayout tenantId={id}><p>No data.</p></BaseLayout>;

  return (
    <BaseLayout tenantId={id}>
      <h1 style={{ fontFamily: "system-ui" }}>Principals (advertisers)</h1>
      <p style={{ marginBottom: "1rem" }}>
        <Link to={`/tenant/${id}/principals/create`} style={{ color: "var(--link, #06c)" }}>Add principal</Link>
      </p>
      <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem" }}>
        <button type="button" onClick={() => setTab("list")} style={{ fontWeight: tab === "list" ? 600 : 400 }}>List</button>
        <button type="button" onClick={() => setTab("webhooks")} style={{ fontWeight: tab === "webhooks" ? 600 : 400 }}>Webhooks</button>
      </div>

      {tab === "list" && (
        data.principals.length === 0 ? (
          <p style={{ color: "#666" }}>No principals.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "system-ui" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #eee" }}>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>Name</th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>Principal ID</th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>Access Token (MCP)</th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>Media buys</th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>Created</th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.principals.map((p) => (
                <tr key={p.principal_id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "0.5rem" }}>{p.name}</td>
                  <td style={{ padding: "0.5rem", fontFamily: "monospace", fontSize: "0.875rem" }}>{p.principal_id}</td>
                  <td style={{ padding: "0.5rem" }}>
                    <span style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "#555" }}>
                      {p.access_token.slice(0, 8)}…
                    </span>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(p.access_token).then(() => window.alert("Access token copied!"))}
                      style={{ marginLeft: "0.5rem", fontSize: "0.75rem", cursor: "pointer", padding: "0.1rem 0.4rem", border: "1px solid #ccc", borderRadius: 3, background: "#f5f5f5" }}
                    >
                      Copy
                    </button>
                  </td>
                  <td style={{ padding: "0.5rem" }}>{p.media_buy_count}</td>
                  <td style={{ padding: "0.5rem" }}>{p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}</td>
                  <td style={{ padding: "0.5rem" }}>
                    <Link to={`/tenant/${id}/principals/${encodeURIComponent(p.principal_id)}/edit`} style={{ marginRight: "0.5rem" }}>Edit</Link>
                    <button type="button" onClick={() => handleDelete(p.principal_id, p.name)} style={{ color: "crimson", cursor: "pointer", background: "none", border: "none", padding: 0 }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}

      {tab === "webhooks" && <WebhooksTab tenantId={id} />}
    </BaseLayout>
  );
}

interface PrincipalCreateFormProps {
  tenantId: string;
  onSuccess: () => void;
}

function PrincipalCreateForm({ tenantId, onSuccess }: PrincipalCreateFormProps) {
  const [tenantName, setTenantName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [name, setName] = useState("");
  const [gamAdvertiserId, setGamAdvertiserId] = useState("");
  const [enableMock, setEnableMock] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/tenant/${tenantId}/principals/create`, { credentials: "include" })
      .then((res) => res.ok ? res.json() : null)
      .then((data: { tenant_name?: string } | null) => {
        if (!cancelled && data) setTenantName(data.tenant_name ?? "");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitBusy(true);
    try {
      const res = await fetch(`/tenant/${tenantId}/principals/create`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), gam_advertiser_id: gamAdvertiserId.trim() || undefined, enable_mock: enableMock }),
      });
      const result = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (result.success) onSuccess();
      else window.alert(result.error ?? "Create failed");
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSubmitBusy(false);
    }
  };

  if (loading) return <BaseLayout tenantId={tenantId}><p>Loading…</p></BaseLayout>;
  return (
    <BaseLayout tenantId={tenantId} tenantName={tenantName}>
      <p style={{ marginBottom: "1rem" }}><Link to={`/tenant/${tenantId}/principals`} style={{ color: "var(--link, #06c)" }}>← Back to list</Link></p>
      <h1 style={{ fontFamily: "system-ui" }}>Add principal</h1>
      <form onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
        <div style={{ marginBottom: "0.75rem" }}>
          <label>Name <input type="text" value={name} onChange={(e) => setName(e.target.value)} required style={{ width: "100%" }} /></label>
        </div>
        <div style={{ marginBottom: "0.75rem" }}>
          <label>GAM Advertiser ID (optional) <input type="text" value={gamAdvertiserId} onChange={(e) => setGamAdvertiserId(e.target.value)} style={{ width: "100%" }} /></label>
        </div>
        <label><input type="checkbox" checked={enableMock} onChange={(e) => setEnableMock(e.target.checked)} /> Enable mock</label>
        <div style={{ marginTop: "1rem" }}><button type="submit" disabled={submitBusy}>Create</button></div>
      </form>
    </BaseLayout>
  );
}

interface PrincipalEditFormProps {
  tenantId: string;
  principalId: string;
  onSuccess: () => void;
}

function PrincipalEditForm({ tenantId, principalId, onSuccess }: PrincipalEditFormProps) {
  const [tenantName, setTenantName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [name, setName] = useState("");
  const [gamAdvertiserId, setGamAdvertiserId] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/tenant/${tenantId}/principals/${encodeURIComponent(principalId)}/edit`, { credentials: "include" })
      .then((res) => res.ok ? res.json() : null)
      .then((data: { tenant_name?: string; principal?: { name: string }; existing_gam_id?: string } | null) => {
        if (!cancelled && data) {
          setTenantName(data.tenant_name ?? "");
          if (data.principal) setName(data.principal.name);
          if (data.existing_gam_id != null) setGamAdvertiserId(String(data.existing_gam_id));
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tenantId, principalId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitBusy(true);
    try {
      const res = await fetch(`/tenant/${tenantId}/principals/${encodeURIComponent(principalId)}/edit`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), gam_advertiser_id: gamAdvertiserId.trim() || undefined }),
      });
      const result = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (result.success) onSuccess();
      else window.alert(result.error ?? "Update failed");
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSubmitBusy(false);
    }
  };

  if (loading) return <BaseLayout tenantId={tenantId}><p>Loading…</p></BaseLayout>;
  return (
    <BaseLayout tenantId={tenantId} tenantName={tenantName}>
      <p style={{ marginBottom: "1rem" }}><Link to={`/tenant/${tenantId}/principals`} style={{ color: "var(--link, #06c)" }}>← Back to list</Link></p>
      <h1 style={{ fontFamily: "system-ui" }}>Edit principal</h1>
      <form onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
        <div style={{ marginBottom: "0.75rem" }}>
          <label>Name <input type="text" value={name} onChange={(e) => setName(e.target.value)} required style={{ width: "100%" }} /></label>
        </div>
        <div style={{ marginBottom: "0.75rem" }}>
          <label>GAM Advertiser ID <input type="text" value={gamAdvertiserId} onChange={(e) => setGamAdvertiserId(e.target.value)} style={{ width: "100%" }} /></label>
        </div>
        <button type="submit" disabled={submitBusy}>Save</button>
      </form>
    </BaseLayout>
  );
}

function WebhooksTab({ tenantId }: { tenantId: string }) {
  const [webhooks, setWebhooks] = useState<Array<{ log_id: number; timestamp: string | null; principal_name: string | null; success: boolean; error_message: string | null; details: unknown }>>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/tenant/${tenantId}/webhooks?limit=50`, { credentials: "include" })
      .then((res) => res.ok ? res.json() : null)
      .then((data: { webhook_logs?: unknown[]; total_webhooks?: number } | null) => {
        if (!cancelled && data) {
          setWebhooks(Array.isArray(data.webhook_logs) ? data.webhook_logs : []);
          setTotal(Number(data.total_webhooks ?? 0));
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tenantId]);

  if (loading) return <p>Loading webhooks…</p>;
  return (
    <div>
      <p style={{ color: "#666", marginBottom: "0.5rem" }}>Total webhook events: {total}</p>
      {webhooks.length === 0 ? (
        <p style={{ color: "#666" }}>No webhook logs.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "system-ui", fontSize: "0.875rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #eee" }}>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Time</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Principal</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Status</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Error</th>
            </tr>
          </thead>
          <tbody>
            {webhooks.map((w) => (
              <tr key={w.log_id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "0.5rem" }}>{w.timestamp ? new Date(w.timestamp).toLocaleString() : "—"}</td>
                <td style={{ padding: "0.5rem" }}>{w.principal_name ?? "—"}</td>
                <td style={{ padding: "0.5rem" }}>{w.success ? "✓" : "✗"}</td>
                <td style={{ padding: "0.5rem", color: w.success ? "inherit" : "crimson" }}>{w.error_message ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function PrincipalsPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <PrivateRoute requireAuth requireTenantAccess tenantId={id}>
      <PrincipalsContent />
    </PrivateRoute>
  );
}
