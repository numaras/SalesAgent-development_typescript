import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Box, Button, Paper, Typography, Alert, CircularProgress,
  List, ListItemButton, ListItemText, ListItemIcon,
} from "@mui/material";
import RadioButtonCheckedIcon from "@mui/icons-material/RadioButtonChecked";
import BusinessIcon from "@mui/icons-material/Business";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

export default function SelectTenantPage() {
  const { user, available_tenants, loading, refetch } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "background.default" }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!user) {
    navigate("/login", { state: { from: location }, replace: true });
    return null;
  }

  const handleSelect = async (tenantId: string) => {
    setSelectedId(tenantId);
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/auth/select-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tenant_id: tenantId }),
        redirect: "manual",
      });
      if (res.ok || res.type === "opaqueredirect") {
        await refetch();
        const target = from?.startsWith("/tenant/") ? from : `/tenant/${encodeURIComponent(tenantId)}`;
        navigate(target, { replace: true });
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      setError(data.error ?? data.message ?? "Failed to select tenant");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    await handleSelect(selectedId);
  };

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
      <Box sx={{ width: "100%", maxWidth: 480 }}>
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
            Select Tenant
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Choose a tenant to operate on
          </Typography>
        </Box>

        <Paper elevation={0} sx={{ p: 0, overflow: "hidden", position: "relative" }}>
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

          {available_tenants.length === 0 ? (
            <Box sx={{ p: 3 }}>
              <Alert severity="warning">
                No tenants available. Please contact your administrator.
              </Alert>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleSubmit}>
              <List disablePadding>
                {available_tenants.map((t, idx) => (
                  <ListItemButton
                    key={t.tenant_id}
                    selected={selectedId === t.tenant_id}
                    onClick={() => setSelectedId(t.tenant_id)}
                    sx={{
                      py: 1.75,
                      px: 2.5,
                      borderBottom: idx < available_tenants.length - 1 ? "1px solid" : "none",
                      borderColor: "divider",
                      "&.Mui-selected": {
                        bgcolor: "rgba(0,212,255,0.06)",
                        borderLeft: "3px solid",
                        borderLeftColor: "primary.main",
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <BusinessIcon sx={{ color: selectedId === t.tenant_id ? "primary.main" : "text.secondary", fontSize: 20 }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={t.name}
                      secondary={t.tenant_id}
                      primaryTypographyProps={{ fontWeight: 600, color: selectedId === t.tenant_id ? "primary.main" : "text.primary" }}
                      secondaryTypographyProps={{ fontSize: "0.72rem", fontFamily: "monospace", color: "text.secondary" }}
                    />
                    {selectedId === t.tenant_id && (
                      <ArrowForwardIcon sx={{ color: "primary.main", fontSize: 18 }} />
                    )}
                  </ListItemButton>
                ))}
              </List>

              <Box sx={{ p: 2, borderTop: "1px solid", borderColor: "divider" }}>
                {error && <Alert severity="error" sx={{ mb: 1.5, py: 0 }}>{error}</Alert>}
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={!selectedId || submitting}
                  endIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <ArrowForwardIcon />}
                  sx={{ py: 1.25 }}
                >
                  {submitting ? "Connecting…" : "Enter Dashboard"}
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
