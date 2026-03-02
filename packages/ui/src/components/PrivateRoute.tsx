import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export interface PrivateRouteProps {
  children: ReactNode;
  /** If true, redirect to /login when no user (require_auth). Default true. */
  requireAuth?: boolean;
  /** If true, require tenant_id in session (or super_admin); else redirect to /select-tenant (require_tenant_access). */
  requireTenantAccess?: boolean;
  /** When requireTenantAccess, the tenant id from the route (e.g. /tenant/:id). If not provided, only require tenant_id set. */
  tenantId?: string | null;
}

/**
 * Guards: require_auth (redirect to /login if no user); require_tenant_access (redirect to /select-tenant or 403).
 * Parity with _legacy require_auth and require_tenant_access decorators.
 */
export function PrivateRoute({
  children,
  requireAuth = true,
  requireTenantAccess = false,
  tenantId = null,
}: PrivateRouteProps) {
  const { user, role, tenant_id, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ padding: "2rem", fontFamily: "system-ui" }}>Loading…</div>
    );
  }

  if (requireAuth && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireTenantAccess) {
    const isSuperAdmin = role === "super_admin";
    if (!tenant_id && !isSuperAdmin) {
      return <Navigate to="/select-tenant" state={{ from: location }} replace />;
    }
    if (tenantId != null && tenantId !== "" && !isSuperAdmin && tenant_id !== tenantId) {
      return (
        <div style={{ padding: "2rem", fontFamily: "system-ui" }}>
          <h1>403</h1>
          <p>Access denied to this tenant.</p>
        </div>
      );
    }
  }

  return <>{children}</>;
}
