import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { BaseLayout } from "../components/BaseLayout";
import { PrivateRoute } from "../components/PrivateRoute";

interface CreativeAgentRow {
  id: number;
  agent_url: string;
  name: string;
  enabled: boolean;
  priority: number;
  timeout: number;
  auth_type: string | null;
  has_auth: boolean;
  created_at: string | null;
}

interface CreativeAgentsListResponse {
  tenant_id: string;
  tenant_name: string;
  custom_agents: CreativeAgentRow[];
}

interface CreativeAgentFormResponse {
  tenant_id: string;
  tenant_name: string;
  mode: "add" | "edit";
  agent: {
    id: number;
    agent_url: string;
    name: string;
    enabled: boolean;
    priority: number;
    timeout: number;
    auth_type: string | null;
    auth_header: string | null;
    auth_credentials: string | null;
  } | null;
}

function CreativeAgentsContent() {
  const { id, agentId } = useParams<{ id: string; agentId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState<CreativeAgentsListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isCreate = location.pathname.endsWith("/add");
  const isEdit = agentId != null && location.pathname.endsWith("/edit");
  const showList = !isCreate && !isEdit;

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/tenant/${id}/creative-agents/`, { credentials: "include" });
      if (!res.ok) {
        setError(res.status === 401 ? "Unauthorized" : "Failed to load");
        return;
      }
      const json = (await res.json()) as CreativeAgentsListResponse;
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

  const handleDelete = async (row: CreativeAgentRow) => {
    if (!id || !window.confirm(`Delete creative agent "${row.name}"?`)) return;
    try {
      const res = await fetch(`/tenant/${id}/creative-agents/${row.id}`, {
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

  const handleTest = async (row: CreativeAgentRow) => {
    if (!id) return;
    try {
      const res = await fetch(`/tenant/${id}/creative-agents/${row.id}/test`, {
        method: "POST",
        credentials: "include",
      });
      const result = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
        error?: string;
        format_count?: number;
        sample_formats?: string[];
      };
      if (result.success) {
        const details = result.format_count != null
          ? `\nFormats found: ${result.format_count}\nSample: ${(result.sample_formats ?? []).join(", ") || "n/a"}`
          : "";
        window.alert((result.message ?? "Connection test succeeded") + details);
      } else {
        window.alert(result.error ?? "Connection test failed");
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Request failed");
    }
  };

  if (!id) return null;
  if (isCreate) return <CreativeAgentCreateForm tenantId={id} onSuccess={() => navigate(`/tenant/${id}/creative-agents`)} />;
  if (isEdit && agentId) return <CreativeAgentEditForm tenantId={id} agentId={agentId} onSuccess={() => navigate(`/tenant/${id}/creative-agents`)} />;
  if (loading) return <BaseLayout tenantId={id}><p>Loading…</p></BaseLayout>;
  if (error) return <BaseLayout tenantId={id}><p style={{ color: "crimson" }}>{error}</p></BaseLayout>;
  if (!data) return <BaseLayout tenantId={id}><p>No data.</p></BaseLayout>;

  return (
    <BaseLayout tenantId={id} tenantName={data.tenant_name}>
      <h1 style={{ fontFamily: "system-ui" }}>Creative Agents</h1>
      <p style={{ marginBottom: "1rem" }}>
        <Link to={`/tenant/${id}/creative-agents/add`} style={{ color: "var(--link, #06c)" }}>Add creative agent</Link>
      </p>
      {data.custom_agents.length === 0 ? (
        <p style={{ color: "#666" }}>No custom creative agents configured.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "system-ui" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #eee" }}>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Name</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Agent URL</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Enabled</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Priority</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Timeout (s)</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Auth</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Created</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.custom_agents.map((row) => (
              <tr key={row.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "0.5rem" }}>{row.name}</td>
                <td style={{ padding: "0.5rem", fontFamily: "monospace", fontSize: "0.8rem" }}>{row.agent_url}</td>
                <td style={{ padding: "0.5rem" }}>{row.enabled ? "Yes" : "No"}</td>
                <td style={{ padding: "0.5rem" }}>{row.priority}</td>
                <td style={{ padding: "0.5rem" }}>{row.timeout}</td>
                <td style={{ padding: "0.5rem" }}>{row.has_auth ? row.auth_type ?? "configured" : "none"}</td>
                <td style={{ padding: "0.5rem" }}>{row.created_at ? new Date(row.created_at).toLocaleString() : "—"}</td>
                <td style={{ padding: "0.5rem", whiteSpace: "nowrap" }}>
                  <Link to={`/tenant/${id}/creative-agents/${row.id}/edit`} style={{ marginRight: "0.5rem" }}>Edit</Link>
                  <button type="button" onClick={() => handleTest(row)} style={{ marginRight: "0.5rem" }}>Test</button>
                  <button type="button" onClick={() => handleDelete(row)} style={{ color: "crimson" }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </BaseLayout>
  );
}

function CreativeAgentCreateForm({ tenantId, onSuccess }: { tenantId: string; onSuccess: () => void }) {
  const [meta, setMeta] = useState<CreativeAgentFormResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [agentUrl, setAgentUrl] = useState("");
  const [name, setName] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [priority, setPriority] = useState(10);
  const [timeout, setTimeout] = useState(30);
  const [authType, setAuthType] = useState("");
  const [authHeader, setAuthHeader] = useState("");
  const [authCredentials, setAuthCredentials] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/tenant/${tenantId}/creative-agents/add`, { credentials: "include" })
      .then((res) => res.ok ? res.json() : null)
      .then((data: CreativeAgentFormResponse | null) => {
        if (!cancelled && data) setMeta(data);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitBusy(true);
    try {
      const res = await fetch(`/tenant/${tenantId}/creative-agents/add`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_url: agentUrl.trim(),
          name: name.trim(),
          enabled,
          priority,
          timeout,
          auth_type: authType.trim() || null,
          auth_header: authHeader.trim() || null,
          auth_credentials: authCredentials.trim() || null,
        }),
      });
      const result = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (result.success) onSuccess();
      else window.alert(result.error ?? "Create failed");
    } finally {
      setSubmitBusy(false);
    }
  };

  if (loading) return <BaseLayout tenantId={tenantId}><p>Loading…</p></BaseLayout>;
  return (
    <BaseLayout tenantId={tenantId} tenantName={meta?.tenant_name}>
      <p style={{ marginBottom: "1rem" }}><Link to={`/tenant/${tenantId}/creative-agents`} style={{ color: "var(--link, #06c)" }}>← Back to list</Link></p>
      <h1 style={{ fontFamily: "system-ui" }}>Add creative agent</h1>
      <CreativeAgentForm
        submitLabel="Create"
        submitBusy={submitBusy}
        onSubmit={handleSubmit}
        agentUrl={agentUrl}
        setAgentUrl={setAgentUrl}
        name={name}
        setName={setName}
        enabled={enabled}
        setEnabled={setEnabled}
        priority={priority}
        setPriority={setPriority}
        timeout={timeout}
        setTimeout={setTimeout}
        authType={authType}
        setAuthType={setAuthType}
        authHeader={authHeader}
        setAuthHeader={setAuthHeader}
        authCredentials={authCredentials}
        setAuthCredentials={setAuthCredentials}
      />
    </BaseLayout>
  );
}

function CreativeAgentEditForm({ tenantId, agentId, onSuccess }: { tenantId: string; agentId: string; onSuccess: () => void }) {
  const [meta, setMeta] = useState<CreativeAgentFormResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [agentUrl, setAgentUrl] = useState("");
  const [name, setName] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [priority, setPriority] = useState(10);
  const [timeout, setTimeout] = useState(30);
  const [authType, setAuthType] = useState("");
  const [authHeader, setAuthHeader] = useState("");
  const [authCredentials, setAuthCredentials] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/tenant/${tenantId}/creative-agents/${encodeURIComponent(agentId)}/edit`, { credentials: "include" })
      .then((res) => res.ok ? res.json() : null)
      .then((data: CreativeAgentFormResponse | null) => {
        if (cancelled || !data) return;
        setMeta(data);
        if (data.agent) {
          setAgentUrl(data.agent.agent_url ?? "");
          setName(data.agent.name ?? "");
          setEnabled(Boolean(data.agent.enabled));
          setPriority(Number(data.agent.priority ?? 10));
          setTimeout(Number(data.agent.timeout ?? 30));
          setAuthType(data.agent.auth_type ?? "");
          setAuthHeader(data.agent.auth_header ?? "");
          setAuthCredentials(data.agent.auth_credentials ?? "");
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tenantId, agentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitBusy(true);
    try {
      const res = await fetch(`/tenant/${tenantId}/creative-agents/${encodeURIComponent(agentId)}/edit`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_url: agentUrl.trim(),
          name: name.trim(),
          enabled,
          priority,
          timeout,
          auth_type: authType.trim() || null,
          auth_header: authHeader.trim() || null,
          auth_credentials: authCredentials.trim() || null,
        }),
      });
      const result = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (result.success) onSuccess();
      else window.alert(result.error ?? "Update failed");
    } finally {
      setSubmitBusy(false);
    }
  };

  if (loading) return <BaseLayout tenantId={tenantId}><p>Loading…</p></BaseLayout>;
  return (
    <BaseLayout tenantId={tenantId} tenantName={meta?.tenant_name}>
      <p style={{ marginBottom: "1rem" }}><Link to={`/tenant/${tenantId}/creative-agents`} style={{ color: "var(--link, #06c)" }}>← Back to list</Link></p>
      <h1 style={{ fontFamily: "system-ui" }}>Edit creative agent</h1>
      <CreativeAgentForm
        submitLabel="Save"
        submitBusy={submitBusy}
        onSubmit={handleSubmit}
        agentUrl={agentUrl}
        setAgentUrl={setAgentUrl}
        name={name}
        setName={setName}
        enabled={enabled}
        setEnabled={setEnabled}
        priority={priority}
        setPriority={setPriority}
        timeout={timeout}
        setTimeout={setTimeout}
        authType={authType}
        setAuthType={setAuthType}
        authHeader={authHeader}
        setAuthHeader={setAuthHeader}
        authCredentials={authCredentials}
        setAuthCredentials={setAuthCredentials}
      />
    </BaseLayout>
  );
}

function CreativeAgentForm(props: {
  submitLabel: string;
  submitBusy: boolean;
  onSubmit: (e: React.FormEvent) => void;
  agentUrl: string;
  setAgentUrl: (v: string) => void;
  name: string;
  setName: (v: string) => void;
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  priority: number;
  setPriority: (v: number) => void;
  timeout: number;
  setTimeout: (v: number) => void;
  authType: string;
  setAuthType: (v: string) => void;
  authHeader: string;
  setAuthHeader: (v: string) => void;
  authCredentials: string;
  setAuthCredentials: (v: string) => void;
}) {
  return (
    <form onSubmit={props.onSubmit} style={{ maxWidth: 560 }}>
      <div style={{ marginBottom: "0.75rem" }}>
        <label>Name <input type="text" value={props.name} onChange={(e) => props.setName(e.target.value)} required style={{ width: "100%" }} /></label>
      </div>
      <div style={{ marginBottom: "0.75rem" }}>
        <label>Agent URL <input type="url" value={props.agentUrl} onChange={(e) => props.setAgentUrl(e.target.value)} required style={{ width: "100%" }} placeholder="https://creative.adcontextprotocol.org" /></label>
      </div>
      <div style={{ marginBottom: "0.75rem", display: "flex", gap: "1rem", alignItems: "center" }}>
        <label>Priority <input type="number" value={props.priority} onChange={(e) => props.setPriority(Number(e.target.value || "10"))} style={{ width: 120 }} /></label>
        <label>Timeout (s) <input type="number" min={1} max={300} value={props.timeout} onChange={(e) => props.setTimeout(Number(e.target.value || "30"))} style={{ width: 120 }} /></label>
        <label><input type="checkbox" checked={props.enabled} onChange={(e) => props.setEnabled(e.target.checked)} /> Enabled</label>
      </div>
      <div style={{ marginBottom: "0.75rem" }}>
        <label>Auth type <input type="text" value={props.authType} onChange={(e) => props.setAuthType(e.target.value)} style={{ width: "100%" }} placeholder="e.g. bearer" /></label>
      </div>
      <div style={{ marginBottom: "0.75rem" }}>
        <label>Auth header <input type="text" value={props.authHeader} onChange={(e) => props.setAuthHeader(e.target.value)} style={{ width: "100%" }} placeholder="x-adcp-auth" /></label>
      </div>
      <div style={{ marginBottom: "0.75rem" }}>
        <label>Auth credentials <input type="password" value={props.authCredentials} onChange={(e) => props.setAuthCredentials(e.target.value)} style={{ width: "100%" }} placeholder="Optional token or secret" /></label>
      </div>
      <button type="submit" disabled={props.submitBusy}>{props.submitLabel}</button>
    </form>
  );
}

export default function CreativeAgentsPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <PrivateRoute requireAuth requireTenantAccess tenantId={id}>
      <CreativeAgentsContent />
    </PrivateRoute>
  );
}
