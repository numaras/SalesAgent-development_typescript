import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface TenantOption {
  tenant_id: string;
  name: string;
  is_admin?: boolean;
}

export interface SessionData {
  user?: string;
  role?: string;
  tenant_id?: string;
  signup_flow?: boolean;
  available_tenants?: TenantOption[];
}

export interface AuthContextValue {
  user: string | null;
  role: string | null;
  tenant_id: string | null;
  signup_flow: boolean;
  available_tenants: TenantOption[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_API = "/api/session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(SESSION_API, { credentials: "include" });
      if (res.status === 401) {
        setSession(null);
        return;
      }
      if (!res.ok) {
        throw new Error(`Session API ${res.status}`);
      }
      const data = (await res.json()) as SessionData;
      setSession(data);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      role: session?.role ?? null,
      tenant_id: session?.tenant_id ?? null,
      signup_flow: session?.signup_flow ?? false,
      available_tenants: session?.available_tenants ?? [],
      loading,
      error,
      refetch: fetchSession,
    }),
    [session, loading, error, fetchSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
