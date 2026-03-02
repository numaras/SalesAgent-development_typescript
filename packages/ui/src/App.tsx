import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { Box, CircularProgress } from "@mui/material";

/**
 * Root route — resolves auth state and redirects to the correct destination.
 *
 * Redirect logic (parity with _legacy auth.py require_auth + index view):
 *   - loading         → show spinner (avoids flash-of-redirect)
 *   - not logged in   → /login
 *   - has tenant_id   → /tenant/:id  (normal users land here directly)
 *   - super_admin w/o tenant → /select-tenant  (choose which tenant to operate on)
 *   - no tenant, no super_admin → /select-tenant  (fallback)
 */
export default function App() {
  const { user, role, tenant_id, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    if (tenant_id) {
      navigate(`/tenant/${encodeURIComponent(tenant_id)}`, { replace: true });
      return;
    }

    // super_admin or user with no tenant yet
    navigate("/select-tenant", { replace: true });
  }, [loading, user, role, tenant_id, navigate]);

  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", bgcolor: "background.default" }}>
      <CircularProgress color="primary" />
    </Box>
  );
}
