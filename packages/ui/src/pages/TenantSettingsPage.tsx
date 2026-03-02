import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BaseLayout } from "../components/BaseLayout";
import { PrivateRoute } from "../components/PrivateRoute";

type SettingsTab = "general" | "adapter" | "slack" | "ai" | "domains";

/**
 * Tabs: General / Adapter / Slack / AI / Domains; api_mode JSON round-trips.
 * GET/POST settings/general; POST adapter, update_slack, settings/ai; domains add/remove.
 */
function TenantSettingsContent() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<SettingsTab>("general");
  const [general, setGeneral] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState("");

  const loadGeneral = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/tenant/${id}/settings/general`, { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as { tenant: Record<string, unknown> };
      setGeneral(data.tenant ?? null);
      setTenantName(String(data.tenant?.name ?? ""));
    } catch {
      // ignore
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    loadGeneral()
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [id, loadGeneral]);

  if (!id) return null;
  if (loading && !general) return <BaseLayout tenantId={id}><p>Loading…</p></BaseLayout>;
  if (error && !general) return <BaseLayout tenantId={id}><p style={{ color: "crimson" }}>{error}</p></BaseLayout>;

  return (
    <BaseLayout tenantId={id} tenantName={tenantName || undefined}>
      <h1 style={{ fontFamily: "system-ui" }}>Tenant settings</h1>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {(["general", "adapter", "slack", "ai", "domains"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} style={{ fontWeight: tab === t ? 600 : 400 }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "general" && general && (
        <GeneralTab tenantId={id} initial={general} onSaved={loadGeneral} />
      )}
      {tab === "adapter" && <AdapterTab tenantId={id} />}
      {tab === "slack" && <SlackTab tenantId={id} />}
      {tab === "ai" && <AiTab tenantId={id} />}
      {tab === "domains" && <DomainsTab tenantId={id} />}
    </BaseLayout>
  );
}

function GeneralTab({
  tenantId,
  initial,
  onSaved,
}: {
  tenantId: string;
  initial: Record<string, unknown>;
  onSaved: () => void;
}) {
  const [name, setName] = useState(String(initial.name ?? ""));
  const [busy, setBusy] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`/tenant/${tenantId}/settings/general`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.ok) await onSaved();
      else window.alert("Failed to save");
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
      <div style={{ marginBottom: "0.75rem" }}>
        <label>Tenant name <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%" }} /></label>
      </div>
      <button type="submit" disabled={busy}>Save general</button>
    </form>
  );
}

function AdapterTab({ tenantId }: { tenantId: string }) {
  const [adapter, setAdapter] = useState("google_ad_manager");
  const [busy, setBusy] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`/tenant/${tenantId}/settings/adapter`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adapter }),
      });
      const result = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (result.success) window.alert("Adapter updated");
      else window.alert(result.error ?? "Failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
      <div style={{ marginBottom: "0.75rem" }}>
        <label>Adapter </label>
        <select value={adapter} onChange={(e) => setAdapter(e.target.value)}>
          <option value="google_ad_manager">Google Ad Manager</option>
          <option value="mock">Mock</option>
          <option value="kevel">Kevel</option>
        </select>
      </div>
      <button type="submit" disabled={busy}>Save adapter</button>
      {adapter === "google_ad_manager" && (
        <p style={{ marginTop: "0.75rem", fontSize: "0.875rem" }}>
          <Link to={`/tenant/${tenantId}/gam/config`}>
            Configure Google Ad Manager (credentials, auth method) →
          </Link>
        </p>
      )}
    </form>
  );
}

function SlackTab({ tenantId }: { tenantId: string }) {
  const [webhook, setWebhook] = useState("");
  const [auditWebhook, setAuditWebhook] = useState("");
  const [busy, setBusy] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`/tenant/${tenantId}/update_slack`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slack_webhook_url: webhook.trim() || "",
          slack_audit_webhook_url: auditWebhook.trim() || "",
        }),
      });
      const result = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (result.success) window.alert("Slack updated");
      else window.alert(result.error ?? "Failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
      <div style={{ marginBottom: "0.75rem" }}>
        <label>Slack webhook URL <input type="url" value={webhook} onChange={(e) => setWebhook(e.target.value)} style={{ width: "100%" }} placeholder="https://..." /></label>
      </div>
      <div style={{ marginBottom: "0.75rem" }}>
        <label>Slack audit webhook URL <input type="url" value={auditWebhook} onChange={(e) => setAuditWebhook(e.target.value)} style={{ width: "100%" }} placeholder="https://..." /></label>
      </div>
      <button type="submit" disabled={busy}>Save Slack</button>
    </form>
  );
}

function AiTab({ tenantId }: { tenantId: string }) {
  const [provider, setProvider] = useState("gemini");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`/tenant/${tenantId}/settings/ai`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ai_provider: provider,
          ai_model: model.trim() || undefined,
          ai_api_key: apiKey.trim() || undefined,
        }),
      });
      const result = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (result.success) window.alert("AI settings saved");
      else window.alert(result.error ?? "Failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
      <div style={{ marginBottom: "0.75rem" }}>
        <label>Provider </label>
        <select value={provider} onChange={(e) => setProvider(e.target.value)}>
          <option value="gemini">Gemini</option>
          <option value="openai">OpenAI</option>
        </select>
      </div>
      <div style={{ marginBottom: "0.75rem" }}>
        <label>Model <input type="text" value={model} onChange={(e) => setModel(e.target.value)} style={{ width: "100%" }} placeholder="e.g. gemini-1.5-flash" /></label>
      </div>
      <div style={{ marginBottom: "0.75rem" }}>
        <label>API key <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} style={{ width: "100%" }} placeholder="Optional if already set" /></label>
      </div>
      <button type="submit" disabled={busy}>Save AI</button>
    </form>
  );
}

function DomainsTab({ tenantId }: { tenantId: string }) {
  const [domains, setDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/tenant/${tenantId}/users`, { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as { authorized_domains?: string[] };
      setDomains(Array.isArray(data.authorized_domains) ? data.authorized_domains : []);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/tenant/${tenantId}/settings/domains/add`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: newDomain.trim() }),
      });
      const result = (await res.json().catch(() => ({}))) as { success?: boolean };
      if (result.success) {
        setNewDomain("");
        await load();
      } else window.alert("Failed to add domain");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (domain: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/tenant/${tenantId}/settings/domains/remove`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      if ((await res.json().catch(() => ({})) as { success?: boolean }).success) await load();
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p>Loading domains…</p>;
  return (
    <div>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {domains.map((d) => (
          <li key={d} style={{ marginBottom: "0.25rem" }}>
            {d} <button type="button" onClick={() => handleRemove(d)} disabled={busy}>Remove</button>
          </li>
        ))}
      </ul>
      <form onSubmit={handleAdd} style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem" }}>
        <input type="text" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} placeholder="example.com" />
        <button type="submit" disabled={busy || !newDomain.trim()}>Add domain</button>
      </form>
    </div>
  );
}

export default function TenantSettingsPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <PrivateRoute requireAuth requireTenantAccess tenantId={id}>
      <TenantSettingsContent />
    </PrivateRoute>
  );
}
