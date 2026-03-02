import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { BaseLayout } from "../components/BaseLayout";
import { PrivateRoute } from "../components/PrivateRoute";

interface PropertyRow {
  property_id: string;
  tenant_id: string;
  property_type: string;
  name: string;
  identifiers: Array<{ type?: string; value?: string }>;
  tags: string[];
  publisher_domain: string;
  verification_status: string;
  verification_checked_at: string | null;
  verification_error: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ListResponse {
  tenant_id: string;
  tenant_name: string;
  properties: PropertyRow[];
  property_counts: { total: number; verified: number; pending: number; failed: number };
}

type Tab = "list" | "tags";

const PROPERTY_TYPES = ["website", "mobile_app", "ctv_app", "dooh", "podcast", "radio", "streaming_audio"] as const;

interface CreateFormData {
  tenant_id: string;
  tenant_name: string;
  property_types: string[];
}
interface EditFormData extends CreateFormData {
  property: PropertyRow | null;
}

function PropertyCreateForm({ tenantId, onSuccess }: { tenantId: string; onSuccess: () => void }) {
  const [meta, setMeta] = useState<CreateFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [name, setName] = useState("");
  const [propertyType, setPropertyType] = useState("website");
  const [publisherDomain, setPublisherDomain] = useState("");
  const [identifiers, setIdentifiers] = useState<Array<{ type: string; value: string }>>([{ type: "domain", value: "" }]);
  const [tags, setTags] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/tenant/${tenantId}/authorized-properties/create`, { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as CreateFormData;
      if (!cancelled) setMeta(data);
    })().finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meta) return;
    const idList = identifiers.filter((i) => i.type.trim() && i.value.trim());
    if (idList.length === 0) {
      window.alert("At least one identifier (type + value) is required");
      return;
    }
    setSubmitBusy(true);
    try {
      const res = await fetch(`/tenant/${tenantId}/authorized-properties/create`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          property_type: propertyType,
          publisher_domain: publisherDomain.trim(),
          identifiers: idList,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        }),
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

  if (loading || !meta) return <BaseLayout tenantId={tenantId}><p>Loading…</p></BaseLayout>;
  return (
    <BaseLayout tenantId={tenantId} tenantName={meta.tenant_name}>
      <p style={{ marginBottom: "1rem" }}><Link to={`/tenant/${tenantId}/authorized-properties`} style={{ color: "var(--link, #06c)" }}>← Back to list</Link></p>
      <h1 style={{ fontFamily: "system-ui" }}>Add property</h1>
      <form onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
        <div style={{ marginBottom: "0.75rem" }}>
          <label>Name <input type="text" value={name} onChange={(e) => setName(e.target.value)} required style={{ width: "100%" }} /></label>
        </div>
        <div style={{ marginBottom: "0.75rem" }}>
          <label>Type <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>{PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></label>
        </div>
        <div style={{ marginBottom: "0.75rem" }}>
          <label>Publisher domain <input type="text" value={publisherDomain} onChange={(e) => setPublisherDomain(e.target.value)} required style={{ width: "100%" }} /></label>
        </div>
        <div style={{ marginBottom: "0.75rem" }}>
          Identifiers (type + value): {identifiers.map((idn, i) => (
            <div key={i} style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
              <input type="text" placeholder="type" value={idn.type} onChange={(e) => setIdentifiers((prev) => { const n = [...prev]; n[i] = { ...n[i], type: e.target.value }; return n; })} />
              <input type="text" placeholder="value" value={idn.value} onChange={(e) => setIdentifiers((prev) => { const n = [...prev]; n[i] = { ...n[i], value: e.target.value }; return n; })} />
            </div>
          ))}
          <button type="button" onClick={() => setIdentifiers((p) => [...p, { type: "", value: "" }])}>Add identifier</button>
        </div>
        <div style={{ marginBottom: "0.75rem" }}>
          <label>Tags (comma-separated) <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} style={{ width: "100%" }} /></label>
        </div>
        <button type="submit" disabled={submitBusy}>Create</button>
      </form>
    </BaseLayout>
  );
}

function PropertyEditForm({ tenantId, propertyId, onSuccess }: { tenantId: string; propertyId: string; onSuccess: () => void }) {
  const [meta, setMeta] = useState<EditFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [name, setName] = useState("");
  const [propertyType, setPropertyType] = useState("website");
  const [publisherDomain, setPublisherDomain] = useState("");
  const [identifiers, setIdentifiers] = useState<Array<{ type: string; value: string }>>([{ type: "domain", value: "" }]);
  const [tags, setTags] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/tenant/${tenantId}/authorized-properties/${encodeURIComponent(propertyId)}/edit`, { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as EditFormData;
      if (!cancelled) {
        setMeta(data);
        if (data.property) {
          setName(data.property.name);
          setPropertyType(data.property.property_type);
          setPublisherDomain(data.property.publisher_domain);
          setIdentifiers((data.property.identifiers?.length ? data.property.identifiers : [{ type: "domain", value: "" }]) as Array<{ type: string; value: string }>);
          setTags((data.property.tags ?? []).join(", "));
        }
      }
    })().finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tenantId, propertyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meta) return;
    const idList = identifiers.filter((i) => i.type.trim() && i.value.trim());
    if (idList.length === 0) {
      window.alert("At least one identifier (type + value) is required");
      return;
    }
    setSubmitBusy(true);
    try {
      const res = await fetch(`/tenant/${tenantId}/authorized-properties/${encodeURIComponent(propertyId)}/edit`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          property_type: propertyType,
          publisher_domain: publisherDomain.trim(),
          identifiers: idList,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        }),
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

  if (loading || !meta) return <BaseLayout tenantId={tenantId}><p>Loading…</p></BaseLayout>;
  return (
    <BaseLayout tenantId={tenantId} tenantName={meta.tenant_name}>
      <p style={{ marginBottom: "1rem" }}><Link to={`/tenant/${tenantId}/authorized-properties`} style={{ color: "var(--link, #06c)" }}>← Back to list</Link></p>
      <h1 style={{ fontFamily: "system-ui" }}>Edit property</h1>
      <form onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
        <div style={{ marginBottom: "0.75rem" }}>
          <label>Name <input type="text" value={name} onChange={(e) => setName(e.target.value)} required style={{ width: "100%" }} /></label>
        </div>
        <div style={{ marginBottom: "0.75rem" }}>
          <label>Type <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>{PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></label>
        </div>
        <div style={{ marginBottom: "0.75rem" }}>
          <label>Publisher domain <input type="text" value={publisherDomain} onChange={(e) => setPublisherDomain(e.target.value)} required style={{ width: "100%" }} /></label>
        </div>
        <div style={{ marginBottom: "0.75rem" }}>
          Identifiers: {identifiers.map((idn, i) => (
            <div key={i} style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
              <input type="text" placeholder="type" value={idn.type} onChange={(e) => setIdentifiers((prev) => { const n = [...prev]; n[i] = { ...n[i], type: e.target.value }; return n; })} />
              <input type="text" placeholder="value" value={idn.value} onChange={(e) => setIdentifiers((prev) => { const n = [...prev]; n[i] = { ...n[i], value: e.target.value }; return n; })} />
            </div>
          ))}
          <button type="button" onClick={() => setIdentifiers((p) => [...p, { type: "", value: "" }])}>Add identifier</button>
        </div>
        <div style={{ marginBottom: "0.75rem" }}>
          <label>Tags (comma-separated) <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} style={{ width: "100%" }} /></label>
        </div>
        <button type="submit" disabled={submitBusy}>Save</button>
      </form>
    </BaseLayout>
  );
}

/**
 * List/create/edit/delete properties; property tags tab.
 * GET /tenant/:id/authorized-properties, POST create/edit/delete.
 */
function AuthorizedPropertiesContent() {
  const { id, propertyId } = useParams<{ id: string; propertyId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("list");
  const [tagFilter, setTagFilter] = useState("");

  const isCreate = location.pathname.endsWith("/create");
  const isEdit = propertyId != null && location.pathname.endsWith("/edit");
  const showList = !isCreate && !isEdit;

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/tenant/${id}/authorized-properties`, { credentials: "include" });
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
    load();
  }, [load]);

  const handleDelete = async (propId: string, name: string) => {
    if (!id || !window.confirm(`Delete property "${name}"?`)) return;
    try {
      const res = await fetch(`/tenant/${id}/authorized-properties/${encodeURIComponent(propId)}/delete`, {
        method: "POST",
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

  if (isCreate) {
    return <PropertyCreateForm tenantId={id} onSuccess={() => navigate(`/tenant/${id}/authorized-properties`)} />;
  }
  if (isEdit && propertyId) {
    return <PropertyEditForm tenantId={id} propertyId={propertyId} onSuccess={() => navigate(`/tenant/${id}/authorized-properties`)} />;
  }

  if (loading) return <BaseLayout tenantId={id}><p>Loading…</p></BaseLayout>;
  if (error) return <BaseLayout tenantId={id}><p style={{ color: "crimson" }}>{error}</p></BaseLayout>;
  if (!data) return <BaseLayout tenantId={id}><p>No data.</p></BaseLayout>;

  const allTags = [...new Set(data.properties.flatMap((p) => p.tags ?? []))].sort();
  const filteredByTag =
    tagFilter.trim() === ""
      ? data.properties
      : data.properties.filter((p) => (p.tags ?? []).includes(tagFilter));

  return (
    <BaseLayout tenantId={id} tenantName={data.tenant_name}>
      <h1 style={{ fontFamily: "system-ui" }}>Authorized Properties</h1>
      <p style={{ marginBottom: "1rem" }}>
        {data.property_counts.total} total · {data.property_counts.verified} verified · {data.property_counts.pending} pending · {data.property_counts.failed} failed
      </p>
      <p style={{ marginBottom: "1rem" }}>
        <Link to={`/tenant/${id}/authorized-properties/create`} style={{ color: "var(--link, #06c)" }}>Add property</Link>
      </p>

      <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem" }}>
        <button type="button" onClick={() => setTab("list")} style={{ fontWeight: tab === "list" ? 600 : 400 }}>
          List
        </button>
        <button type="button" onClick={() => setTab("tags")} style={{ fontWeight: tab === "tags" ? 600 : 400 }}>
          Property tags
        </button>
      </div>

      {tab === "tags" && (
        <div style={{ marginBottom: "1rem" }}>
          <label>
            Filter by tag:{" "}
            <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
              <option value="">All</option>
              {allTags.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          {tagFilter && <span style={{ marginLeft: "0.5rem" }}>{filteredByTag.length} properties</span>}
        </div>
      )}

      {(tab === "list" ? data.properties : filteredByTag).length === 0 ? (
        <p style={{ color: "#666" }}>No properties{tab === "tags" && tagFilter ? " for this tag" : ""}.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "system-ui" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #eee" }}>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Name</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Type</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Publisher domain</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Status</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Tags</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(tab === "list" ? data.properties : filteredByTag).map((p) => (
              <tr key={p.property_id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "0.5rem" }}>{p.name}</td>
                <td style={{ padding: "0.5rem" }}>{p.property_type}</td>
                <td style={{ padding: "0.5rem" }}>{p.publisher_domain}</td>
                <td style={{ padding: "0.5rem" }}>{p.verification_status}</td>
                <td style={{ padding: "0.5rem" }}>{(p.tags ?? []).join(", ") || "—"}</td>
                <td style={{ padding: "0.5rem" }}>
                  <Link to={`/tenant/${id}/authorized-properties/${encodeURIComponent(p.property_id)}/edit`} style={{ marginRight: "0.5rem" }}>Edit</Link>
                  <button type="button" onClick={() => handleDelete(p.property_id, p.name)} style={{ color: "crimson", cursor: "pointer", background: "none", border: "none", padding: 0 }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === "tags" && !tagFilter && allTags.length > 0 && (
        <div style={{ marginTop: "1.5rem" }}>
          <h2 style={{ fontSize: "1rem" }}>All tags</h2>
          <p style={{ color: "#666" }}>{allTags.join(", ")}</p>
        </div>
      )}
    </BaseLayout>
  );
}

export default function AuthorizedPropertiesPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <PrivateRoute requireAuth requireTenantAccess tenantId={id}>
      <AuthorizedPropertiesContent />
    </PrivateRoute>
  );
}
