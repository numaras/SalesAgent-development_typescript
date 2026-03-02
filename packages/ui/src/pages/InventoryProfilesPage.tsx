import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BaseLayout } from "../components/BaseLayout";
import { PrivateRoute } from "../components/PrivateRoute";

interface ProfileRow {
  id: number;
  profile_id: string;
  name: string;
  description: string | null;
  inventory_config: Record<string, unknown>;
  format_ids: unknown[];
  publisher_properties: unknown[];
  product_count: number;
  created_at: string | null;
  updated_at: string | null;
}

interface ListResponse {
  tenant_id: string;
  tenant_name: string;
  profiles: ProfileRow[];
}

/**
 * List profiles; link to add/edit.
 * GET /tenant/:id/inventory-profiles.
 */
function InventoryProfilesContent() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/tenant/${id}/inventory-profiles`, { credentials: "include" });
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

  if (!id) return null;
  if (loading) return <BaseLayout tenantId={id}><p>Loading…</p></BaseLayout>;
  if (error) return <BaseLayout tenantId={id}><p style={{ color: "crimson" }}>{error}</p></BaseLayout>;
  if (!data) return <BaseLayout tenantId={id}><p>No data.</p></BaseLayout>;

  return (
    <BaseLayout tenantId={id} tenantName={data.tenant_name}>
      <h1 style={{ fontFamily: "system-ui" }}>Inventory profiles</h1>
      <p style={{ marginBottom: "1rem" }}>
        <Link to={`/tenant/${id}/inventory-profiles/add`} style={{ color: "var(--link, #06c)" }}>Add profile</Link>
      </p>
      {data.profiles.length === 0 ? (
        <p style={{ color: "#666" }}>No inventory profiles.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "system-ui" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #eee" }}>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Name</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Profile ID</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Products</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Created</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.profiles.map((p) => (
              <tr key={p.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "0.5rem" }}>{p.name}</td>
                <td style={{ padding: "0.5rem" }}>{p.profile_id}</td>
                <td style={{ padding: "0.5rem" }}>{p.product_count}</td>
                <td style={{ padding: "0.5rem" }}>{p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}</td>
                <td style={{ padding: "0.5rem" }}>
                  <Link to={`/tenant/${id}/inventory-profiles/${p.id}/edit`} style={{ color: "var(--link, #06c)" }}>Edit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </BaseLayout>
  );
}

export default function InventoryProfilesPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <PrivateRoute requireAuth requireTenantAccess tenantId={id}>
      <InventoryProfilesContent />
    </PrivateRoute>
  );
}
