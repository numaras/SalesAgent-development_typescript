import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BaseLayout } from "../components/BaseLayout";
import { PrivateRoute } from "../components/PrivateRoute";

interface CreativeItem {
  creative_id: string;
  name: string;
  format: string;
  status: string;
  principal_name: string;
  created_at: string | null;
}

const PAGE_SIZE = 20;

/**
 * Filterable list; pagination. Uses GET /tenant/:id/creatives/review data.
 */
function CreativesListContent() {
  const { id } = useParams<{ id: string }>();
  const [creatives, setCreatives] = useState<CreativeItem[]>([]);
  const [tenantName, setTenantName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

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
      const data = (await res.json()) as { creatives: CreativeItem[]; tenant_name?: string };
      setCreatives(data.creatives ?? []);
      setTenantName(data.tenant_name ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = creatives;
    if (statusFilter) {
      list = list.filter((c) => c.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.creative_id?.toLowerCase().includes(q) ||
          c.principal_name?.toLowerCase().includes(q) ||
          c.format?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [creatives, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageIndex = Math.min(page, totalPages - 1);
  const slice = useMemo(
    () => filtered.slice(pageIndex * PAGE_SIZE, pageIndex * PAGE_SIZE + PAGE_SIZE),
    [filtered, pageIndex],
  );

  if (!id) return null;
  if (loading) return <BaseLayout tenantId={id}><p>Loading…</p></BaseLayout>;
  if (error) return <BaseLayout tenantId={id}><p style={{ color: "crimson" }}>{error}</p></BaseLayout>;

  return (
    <BaseLayout tenantId={id} tenantName={tenantName}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <h1 style={{ fontFamily: "system-ui", margin: 0 }}>Creatives</h1>
        <Link to={`/tenant/${id}/creatives/add`} style={{ background: "rgba(0,212,255,0.12)", color: "#00d4ff", border: "1px solid rgba(0,212,255,0.3)", borderRadius: 6, padding: "0.4rem 1rem", fontWeight: 600, fontSize: "0.875rem", textDecoration: "none" }}>
          + Upload Creative
        </Link>
      </div>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Search name, id, principal, format"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          style={{ minWidth: 200 }}
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
        >
          <option value="">All statuses</option>
          {[...new Set(creatives.map((c) => c.status))].sort().map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      {filtered.length === 0 ? (
        <p style={{ color: "#666" }}>No creatives match.</p>
      ) : (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "system-ui" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #eee" }}>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>ID</th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>Name</th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>Format</th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>Status</th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>Principal</th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {slice.map((c) => (
                <tr key={c.creative_id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "0.5rem" }}>{c.creative_id}</td>
                  <td style={{ padding: "0.5rem" }}>{c.name}</td>
                  <td style={{ padding: "0.5rem" }}>{c.format}</td>
                  <td style={{ padding: "0.5rem" }}>{c.status}</td>
                  <td style={{ padding: "0.5rem" }}>{c.principal_name}</td>
                  <td style={{ padding: "0.5rem" }}>{c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ marginTop: "0.5rem" }}>
            Page {pageIndex + 1} of {totalPages} · {filtered.length} total
          </p>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
            <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={pageIndex === 0}>
              Previous
            </button>
            <button type="button" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={pageIndex >= totalPages - 1}>
              Next
            </button>
          </div>
        </>
      )}
    </BaseLayout>
  );
}

export default function CreativesListPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <PrivateRoute requireAuth requireTenantAccess tenantId={id}>
      <CreativesListContent />
    </PrivateRoute>
  );
}
