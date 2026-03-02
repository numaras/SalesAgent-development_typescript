import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box, Button, TextField, Typography, Alert, Paper,
  Divider, CircularProgress,
} from "@mui/material";
import RadioButtonCheckedIcon from "@mui/icons-material/RadioButtonChecked";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import GoogleIcon from "@mui/icons-material/Google";
import KeyIcon from "@mui/icons-material/Key";

const TEST_LOGIN_ENABLED = import.meta.env.VITE_TEST_LOGIN === "true";

interface LoginContext {
  test_mode: boolean;
  oauth_configured: boolean;
  oidc_enabled: boolean;
  single_tenant_mode: boolean;
  tenant_context: string | null;
  tenant_id: string | null;
  tenant_name: string | null;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/";

  const [ctx, setCtx] = useState<LoginContext | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [testPassword, setTestPassword] = useState("");
  const [testTenantId, setTestTenantId] = useState("");
  const [testError, setTestError] = useState("");
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    fetch("/api/login-context", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data: unknown) => { if (data && typeof data === "object") setCtx(data as LoginContext); })
      .catch(() => {});
  }, []);

  const testMode = ctx?.test_mode ?? TEST_LOGIN_ENABLED;
  const oauthConfigured = ctx?.oauth_configured ?? false;
  const oidcEnabled = ctx?.oidc_enabled ?? false;
  const singleTenantMode = ctx?.single_tenant_mode ?? false;
  const tenantContext = ctx?.tenant_context ?? null;
  const tenantId = ctx?.tenant_id ?? null;
  const tenantName = ctx?.tenant_name ?? null;

  const handleGoogleLogin = () => {
    window.location.href = `/auth/google?next=${encodeURIComponent(from)}`;
  };

  const handleOidcLogin = () => {
    const tid = tenantId ?? tenantContext ?? "default";
    window.location.href = `/auth/oidc/login/${encodeURIComponent(tid)}`;
  };

  const handleTestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestError("");
    setTestLoading(true);
    try {
      const res = await fetch("/test/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: testEmail.trim(),
          password: testPassword,
          tenant_id: testTenantId.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setTestError(data.error ?? `Login failed (${res.status})`);
        return;
      }
      navigate(from, { replace: true });
      window.location.reload();
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setTestLoading(false);
    }
  };

  const handleQuickLogin = (email: string, password: string, tid?: string) => {
    return async (e: React.MouseEvent) => {
      e.preventDefault();
      setTestError("");
      setTestLoading(true);
      try {
        const res = await fetch("/test/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password, tenant_id: tid }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setTestError(data.error ?? `Login failed (${res.status})`);
          return;
        }
        navigate(from, { replace: true });
        window.location.reload();
      } catch (err) {
        setTestError(err instanceof Error ? err.message : "Request failed");
      } finally {
        setTestLoading(false);
      }
    };
  };

  const displayTenantName = tenantName ?? tenantContext;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        backgroundImage: `
          radial-gradient(ellipse at 20% 50%, rgba(0, 212, 255, 0.04) 0%, transparent 60%),
          radial-gradient(ellipse at 80% 20%, rgba(124, 58, 237, 0.05) 0%, transparent 50%),
          linear-gradient(rgba(0, 212, 255, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 212, 255, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: "auto, auto, 40px 40px, 40px 40px",
        p: 2,
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 420 }}>
        {/* Header */}
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 1, mb: 2 }}>
            <RadioButtonCheckedIcon sx={{ color: "primary.main", fontSize: 28, filter: "drop-shadow(0 0 8px #00d4ff)" }} />
            <Typography
              variant="overline"
              sx={{ color: "primary.main", fontWeight: 800, letterSpacing: "0.15em", fontSize: "0.75rem" }}
            >
              AdCP Sales Agent
            </Typography>
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "text.primary", mb: 0.5 }}>
            {displayTenantName ? `${displayTenantName} Dashboard` : "Mission Control"}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {displayTenantName
              ? `Authorized personnel only · ${displayTenantName}`
              : "Administrator access — authorized personnel only"}
          </Typography>
        </Box>

        <Paper elevation={0} sx={{ p: 3, position: "relative", overflow: "hidden" }}>
          {/* Glow accent */}
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              background: "linear-gradient(90deg, transparent, #00d4ff, transparent)",
            }}
          />

          {testMode && (
            <Alert
              severity="info"
              sx={{ mb: 2, bgcolor: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.2)", color: "primary.main", "& .MuiAlert-icon": { color: "primary.main" } }}
            >
              {singleTenantMode ? "Setup Mode — Configure authentication below" : "Setup Mode — Configure OAuth to enable production login"}
            </Alert>
          )}

          {!testMode && !oauthConfigured && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <strong>Authentication not configured.</strong> Set <code>ADCP_AUTH_TEST_MODE=true</code> for test access, or configure OAuth credentials.
            </Alert>
          )}

          {/* OIDC / Google SSO buttons */}
          {oidcEnabled && (
            <Button
              fullWidth
              variant="contained"
              startIcon={<KeyIcon />}
              onClick={handleOidcLogin}
              sx={{ mb: 2, py: 1.25 }}
            >
              Sign in with SSO
            </Button>
          )}

          {oauthConfigured && !oidcEnabled && (
            <Button
              fullWidth
              variant="outlined"
              startIcon={<GoogleIcon />}
              onClick={handleGoogleLogin}
              sx={{ mb: 2, py: 1.25, borderColor: "rgba(0,212,255,0.3)", color: "text.primary" }}
            >
              Sign in with Google
            </Button>
          )}

          {/* Quick-login buttons for test/setup mode */}
          {testMode && (
            <>
              <Divider sx={{ my: 2, borderColor: "divider" }}>
                <Typography variant="caption" sx={{ color: "text.secondary", letterSpacing: "0.08em" }}>
                  {oidcEnabled ? "SETUP ACCESS" : singleTenantMode ? "QUICK START" : "SETUP LOGIN"}
                </Typography>
              </Divider>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {!singleTenantMode && (
                  <Button
                    fullWidth
                    variant="contained"
                    disabled={testLoading}
                    onClick={handleQuickLogin("test_super_admin@example.com", "test123")}
                    startIcon={testLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
                    sx={{ py: 1.25 }}
                  >
                    Log in as Super Admin
                  </Button>
                )}
                <Button
                  fullWidth
                  variant={singleTenantMode && !oidcEnabled ? "contained" : "outlined"}
                  disabled={testLoading}
                  onClick={handleQuickLogin(
                    "test_tenant_admin@example.com",
                    "test123",
                    tenantId ?? tenantContext ?? undefined,
                  )}
                  sx={{
                    py: 1.25,
                    borderColor: "rgba(0,212,255,0.3)",
                    color: singleTenantMode && !oidcEnabled ? undefined : "text.primary",
                  }}
                >
                  {oidcEnabled
                    ? "Log in with Test Credentials"
                    : singleTenantMode
                    ? "Log in to Dashboard"
                    : "Log in as Tenant Admin"}
                </Button>
              </Box>

              <Divider sx={{ my: 2.5, borderColor: "divider" }}>
                <Typography variant="caption" sx={{ color: "text.secondary", letterSpacing: "0.08em" }}>
                  MANUAL TEST LOGIN
                </Typography>
              </Divider>

              <Box component="form" onSubmit={handleTestSubmit} sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                <TextField
                  label="Email"
                  type="email"
                  size="small"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  required
                  autoComplete="username"
                  fullWidth
                />
                <TextField
                  label="Password"
                  type="password"
                  size="small"
                  value={testPassword}
                  onChange={(e) => setTestPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  fullWidth
                />
                <TextField
                  label="Tenant ID (optional)"
                  size="small"
                  value={testTenantId}
                  onChange={(e) => setTestTenantId(e.target.value)}
                  fullWidth
                />
                {testError && <Alert severity="error" sx={{ py: 0 }}>{testError}</Alert>}
                <Button
                  type="submit"
                  variant="outlined"
                  disabled={testLoading}
                  startIcon={testLoading ? <CircularProgress size={16} color="inherit" /> : <LockOutlinedIcon />}
                  sx={{ py: 1, borderColor: "rgba(0,212,255,0.3)", color: "text.primary" }}
                >
                  {testLoading ? "Signing in…" : "Test sign in"}
                </Button>
              </Box>
            </>
          )}
        </Paper>

        <Typography variant="caption" sx={{ display: "block", textAlign: "center", mt: 2, color: "text.secondary" }}>
          {singleTenantMode
            ? `Sales agent access only — ${displayTenantName ?? tenantId ?? "authorized"} employees`
            : tenantId ?? tenantContext
            ? `Sales agent access only — ${displayTenantName ?? tenantId} employees`
            : "Access restricted to authorized administrators"}
        </Typography>
      </Box>
    </Box>
  );
}
