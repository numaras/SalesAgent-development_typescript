import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Alert, Box, Button, Card, CardContent, Chip, Divider,
  FormControl, InputLabel, MenuItem, Select, Stack,
  TextField, Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
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

// ── SSO / OIDC Configuration Panel ──────────────────────────────────────────

const PROVIDER_DISCOVERY: Record<string, string> = {
  google: "https://accounts.google.com/.well-known/openid-configuration",
  microsoft: "https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration",
};

interface OidcConfig {
  provider?: string;
  discovery_url: string | null;
  client_id: string | null;
  has_client_secret: boolean;
  scopes: string;
  logout_url: string | null;
  oidc_enabled: boolean;
  oidc_configured: boolean;
  oidc_valid: boolean;
  oidc_verified: boolean;
  oidc_verified_at: string | null;
  redirect_uri: string | null;
  redirect_uri_changed: boolean;
}

function SsoConfigSection({ tenantId }: { tenantId: string }) {
  const [config, setConfig] = useState<OidcConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state
  const [provider, setProvider] = useState("custom");
  const [discoveryUrl, setDiscoveryUrl] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [scopes, setScopes] = useState("openid email profile");
  const [logoutUrl, setLogoutUrl] = useState("");

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/auth/oidc/tenant/${tenantId}/config`, { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as OidcConfig;
      setConfig(data);
      setProvider(data.provider ?? "custom");
      setDiscoveryUrl(data.discovery_url ?? "");
      setClientId(data.client_id ?? "");
      setScopes(data.scopes ?? "openid email profile");
      setLogoutUrl(data.logout_url ?? "");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { void loadConfig(); }, [loadConfig]);

  // Auto-fill discovery URL when switching provider
  const handleProviderChange = (p: string) => {
    setProvider(p);
    if (PROVIDER_DISCOVERY[p]) setDiscoveryUrl(PROVIDER_DISCOVERY[p]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const body: Record<string, unknown> = { provider, client_id: clientId, scopes };
      if (discoveryUrl.trim()) body.discovery_url = discoveryUrl.trim();
      if (clientSecret.trim()) body.client_secret = clientSecret.trim();
      if (logoutUrl.trim()) body.logout_url = logoutUrl.trim();

      const res = await fetch(`/auth/oidc/tenant/${tenantId}/config`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string; error?: string; config?: OidcConfig };
      if (json.success) {
        setMsg({ type: "success", text: json.message ?? "Saved." });
        if (json.config) setConfig(json.config);
        setClientSecret("");
      } else {
        setMsg({ type: "error", text: json.error ?? "Save failed." });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (enable: boolean) => {
    setMsg(null);
    const path = enable ? "enable" : "disable";
    const res = await fetch(`/auth/oidc/tenant/${tenantId}/${path}`, {
      method: "POST", credentials: "include",
    });
    const json = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string; error?: string };
    if (json.success) {
      setMsg({ type: "success", text: json.message ?? `SSO ${enable ? "enabled" : "disabled"}.` });
      await loadConfig();
    } else {
      setMsg({ type: "error", text: json.error ?? "Action failed." });
    }
  };

  if (loading) return <Typography variant="body2" color="text.secondary">Loading SSO config…</Typography>;

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>SSO / OIDC Configuration</Typography>
          {config && (
            <Stack direction="row" gap={1}>
              {config.oidc_configured && (
                <Chip
                  icon={config.oidc_verified ? <CheckCircleIcon /> : <ErrorIcon />}
                  label={config.oidc_verified ? "Verified" : "Not verified"}
                  color={config.oidc_verified ? "success" : "warning"}
                  size="small"
                />
              )}
              <Chip
                label={config.oidc_enabled ? "Enabled" : "Disabled"}
                color={config.oidc_enabled ? "success" : "default"}
                size="small"
              />
            </Stack>
          )}
        </Stack>

        {/* Redirect URI info */}
        {config?.redirect_uri && (
          <Box sx={{ p: 1.5, mb: 2, background: "rgba(0,212,255,0.05)", borderRadius: 1, border: "1px solid rgba(0,212,255,0.15)" }}>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
              Callback URL — add this to your IdP:
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: "monospace", color: "primary.main", wordBreak: "break-all" }}>
              {config.redirect_uri}
            </Typography>
            {config.redirect_uri_changed && (
              <Typography variant="caption" color="warning.main">
                ⚠ Redirect URI changed since last verification — re-test before enabling.
              </Typography>
            )}
          </Box>
        )}

        {msg && (
          <Alert severity={msg.type} onClose={() => setMsg(null)} sx={{ mb: 2 }}>
            {msg.text}
          </Alert>
        )}

        <form onSubmit={(e) => { void handleSave(e); }}>
          <Stack gap={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Provider</InputLabel>
              <Select value={provider} label="Provider" onChange={(e) => handleProviderChange(e.target.value)}>
                <MenuItem value="google">Google</MenuItem>
                <MenuItem value="microsoft">Microsoft / Azure AD</MenuItem>
                <MenuItem value="custom">Custom (Okta, Auth0, Keycloak…)</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Discovery URL"
              size="small"
              fullWidth
              value={discoveryUrl}
              onChange={(e) => setDiscoveryUrl(e.target.value)}
              placeholder="https://…/.well-known/openid-configuration"
              helperText="Auto-filled for Google and Microsoft. Required for custom providers."
              required={provider === "custom"}
            />

            <TextField label="Client ID" size="small" fullWidth required value={clientId} onChange={(e) => setClientId(e.target.value)} />

            <TextField
              label={config?.has_client_secret ? "Client Secret (leave blank to keep existing)" : "Client Secret"}
              size="small" fullWidth type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              required={!config?.has_client_secret}
              helperText={config?.has_client_secret ? "A secret is already stored. Enter a new one to rotate it." : undefined}
            />

            <TextField label="Scopes" size="small" fullWidth value={scopes} onChange={(e) => setScopes(e.target.value)} />

            <TextField
              label="Logout URL (optional)"
              size="small" fullWidth
              value={logoutUrl}
              onChange={(e) => setLogoutUrl(e.target.value)}
              helperText="Auto-filled for Google/Microsoft if left empty."
            />

            <Stack direction="row" gap={1} flexWrap="wrap">
              <Button type="submit" variant="contained" disabled={saving}>
                {saving ? "Saving…" : "Save configuration"}
              </Button>

              {config?.oidc_configured && (
                <Button
                  variant="outlined"
                  endIcon={<OpenInNewIcon />}
                  onClick={() => window.open(`/auth/oidc/test/${tenantId}`, "_blank")}
                >
                  Test SSO login
                </Button>
              )}

              {config?.oidc_verified && !config.oidc_enabled && (
                <Button variant="contained" color="success" onClick={() => { void handleToggle(true); }}>
                  Enable SSO
                </Button>
              )}

              {config?.oidc_enabled && (
                <Button variant="outlined" color="error" onClick={() => { void handleToggle(false); }}>
                  Disable SSO
                </Button>
              )}
            </Stack>
          </Stack>
        </form>

        {config?.oidc_verified_at && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="caption" color="text.secondary">
              Last verified: {new Date(config.oidc_verified_at).toLocaleString()}
            </Typography>
          </>
        )}
      </CardContent>
    </Card>
  );
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
        <SsoConfigSection tenantId={id} />
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
