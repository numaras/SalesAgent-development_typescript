import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BaseLayout } from "../components/BaseLayout";
import { PrivateRoute } from "../components/PrivateRoute";

interface UserRow {
  user_id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string | null;
  last_login: string | null;
}

interface UsersResponse {
  tenant_id: string;
  tenant_name: string;
  users: UserRow[];
  authorized_domains: string[];
  auth_setup_mode: boolean;
  oidc_enabled: boolean;
}

/**
 * List users; domains add/remove; OIDC config; setup mode toggle.
 * GET /tenant/:id/users; POST add, toggle, update_role, domains; enable/disable setup mode.
 */
function UsersContent() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newDomain, setNewDomain] = useState("");
  const [addUserEmail, setAddUserEmail] = useState("");
  const [addUserRole, setAddUserRole] = useState("viewer");
  const [addBusy, setAddBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/tenant/${id}/users`, { credentials: "include" });
      if (!res.ok) {
        setError(res.status === 401 ? "Unauthorized" : "Failed to load");
        return;
      }
      const json = (await res.json()) as UsersResponse;
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

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newDomain.trim()) return;
    setAddBusy(true);
    try {
      const res = await fetch(`/tenant/${id}/users/domains`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: newDomain.trim() }),
      });
      const result = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (result.success) {
        setNewDomain("");
        await load();
      } else window.alert(result.error ?? "Failed to add domain");
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Request failed");
    } finally {
      setAddBusy(false);
    }
  };

  const handleRemoveDomain = async (domain: string) => {
    if (!id || !window.confirm(`Remove domain ${domain}?`)) return;
    try {
      const res = await fetch(`/tenant/${id}/users/domains`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      const result = (await res.json().catch(() => ({}))) as { success?: boolean };
      if (result.success) await load();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Request failed");
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !addUserEmail.trim()) return;
    setAddBusy(true);
    try {
      const res = await fetch(`/tenant/${id}/users/add`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addUserEmail.trim().toLowerCase(), role: addUserRole }),
      });
      const result = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (result.success) {
        setAddUserEmail("");
        await load();
      } else window.alert(result.error ?? "Failed to add user");
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Request failed");
    } finally {
      setAddBusy(false);
    }
  };

  const handleToggleUser = async (userId: string) => {
    if (!id) return;
    try {
      const res = await fetch(`/tenant/${id}/users/${encodeURIComponent(userId)}/toggle`, {
        method: "POST",
        credentials: "include",
      });
      const result = (await res.json().catch(() => ({}))) as { success?: boolean };
      if (result.success) await load();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Request failed");
    }
  };

  const handleUpdateRole = async (userId: string, role: string) => {
    if (!id) return;
    try {
      const res = await fetch(`/tenant/${id}/users/${encodeURIComponent(userId)}/update_role`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const result = (await res.json().catch(() => ({}))) as { success?: boolean };
      if (result.success) await load();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Request failed");
    }
  };

  const handleSetupMode = async (enable: boolean) => {
    if (!id) return;
    const path = enable ? "enable-setup-mode" : "disable-setup-mode";
    try {
      const res = await fetch(`/tenant/${id}/users/${path}`, { method: "POST", credentials: "include" });
      const result = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (result.success) await load();
      else window.alert(result.error ?? "Failed");
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Request failed");
    }
  };

  if (!id) return null;
  if (loading) return <BaseLayout tenantId={id}><p>Loading…</p></BaseLayout>;
  if (error) return <BaseLayout tenantId={id}><p style={{ color: "crimson" }}>{error}</p></BaseLayout>;
  if (!data) return <BaseLayout tenantId={id}><p>No data.</p></BaseLayout>;

  return (
    <BaseLayout tenantId={id} tenantName={data.tenant_name}>
      <h1 style={{ fontFamily: "system-ui" }}>Users &amp; access</h1>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem" }}>Setup mode</h2>
        <p style={{ color: "#666", marginBottom: "0.5rem" }}>
          Current: <strong>{data.auth_setup_mode ? "Setup mode (test credentials allowed)" : "SSO only"}</strong>
          {data.oidc_enabled && <span> · OIDC: enabled</span>}
        </p>
        <button type="button" onClick={() => handleSetupMode(true)} disabled={data.auth_setup_mode}>Enable setup mode</button>
        <span style={{ marginLeft: "0.5rem" }} />
        <button type="button" onClick={() => handleSetupMode(false)} disabled={!data.auth_setup_mode}>Disable setup mode</button>
      </section>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem" }}>Authorized domains</h2>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {(data.authorized_domains ?? []).map((d) => (
            <li key={d} style={{ marginBottom: "0.25rem" }}>
              {d}{" "}
              <button type="button" onClick={() => handleRemoveDomain(d)} style={{ fontSize: "0.875rem" }}>Remove</button>
            </li>
          ))}
        </ul>
        <form onSubmit={handleAddDomain} style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem" }}>
          <input type="text" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} placeholder="example.com" />
          <button type="submit" disabled={addBusy || !newDomain.trim()}>Add domain</button>
        </form>
      </section>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem" }}>OIDC config</h2>
        <p style={{ color: "#666" }}>Configure SSO at <code>/auth/oidc/tenant/{id}/config</code> (GET/POST). OIDC enabled: {data.oidc_enabled ? "Yes" : "No"}</p>
      </section>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem" }}>Add user</h2>
        <form onSubmit={handleAddUser} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <input type="email" value={addUserEmail} onChange={(e) => setAddUserEmail(e.target.value)} placeholder="email@example.com" required />
          <select value={addUserRole} onChange={(e) => setAddUserRole(e.target.value)}>
            <option value="viewer">viewer</option>
            <option value="manager">manager</option>
            <option value="admin">admin</option>
          </select>
          <button type="submit" disabled={addBusy || !addUserEmail.trim()}>Add user</button>
        </form>
      </section>

      <section>
        <h2 style={{ fontSize: "1rem" }}>Users</h2>
        {data.users.length === 0 ? (
          <p style={{ color: "#666" }}>No users.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "system-ui" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #eee" }}>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>Email</th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>Name</th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>Role</th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>Status</th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => (
                <tr key={u.user_id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "0.5rem" }}>{u.email}</td>
                  <td style={{ padding: "0.5rem" }}>{u.name}</td>
                  <td style={{ padding: "0.5rem" }}>
                    <select
                      value={u.role}
                      onChange={(e) => handleUpdateRole(u.user_id, e.target.value)}
                    >
                      <option value="viewer">viewer</option>
                      <option value="manager">manager</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td style={{ padding: "0.5rem" }}>{u.is_active ? "Active" : "Inactive"}</td>
                  <td style={{ padding: "0.5rem" }}>
                    <button type="button" onClick={() => handleToggleUser(u.user_id)}>
                      {u.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </BaseLayout>
  );
}

export default function UsersPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <PrivateRoute requireAuth requireTenantAccess tenantId={id}>
      <UsersContent />
    </PrivateRoute>
  );
}
