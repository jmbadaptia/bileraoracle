import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { api } from "./api-client";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: number;
  tenantName?: string;
  tenantSlug?: string;
  theme?: string;
}

export interface Tenant {
  id: number;
  name: string;
  slug: string;
  role: string;
}

interface LoginResult {
  token: string;
  user: User;
  tenants?: Tenant[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  pendingTenants: Tenant[] | null;
  login: (email: string, password: string) => Promise<boolean>;
  switchTenant: (tenantId: number) => Promise<void>;
  clearPendingTenants: () => void;
  logout: () => void;
}

function applyTheme(theme?: string) {
  const t = theme && theme !== "default" ? theme : null;
  if (t) {
    document.documentElement.setAttribute("data-theme", t);
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [pendingTenants, setPendingTenants] = useState<Tenant[] | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setIsLoading(false);
      return;
    }

    api
      .get<User>("/auth/me")
      .then((u) => {
        setUser(u);
        localStorage.setItem("user", JSON.stringify(u));
        applyTheme(u.theme);
      })
      .catch(() => {
        setUser(null);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function login(email: string, password: string): Promise<boolean> {
    const result = await api.post<LoginResult>("/auth/login", {
      email,
      password,
    });
    localStorage.setItem("token", result.token);
    localStorage.setItem("user", JSON.stringify(result.user));
    setUser(result.user);
    applyTheme(result.user.theme);

    // If multiple tenants, show selector — return false to prevent navigation
    if (result.tenants && result.tenants.length > 1) {
      setPendingTenants(result.tenants);
      return false;
    }
    return true;
  }

  async function switchTenant(tenantId: number) {
    const result = await api.post<{ token: string; user: User }>(
      "/auth/switch-tenant",
      { tenantId }
    );
    localStorage.setItem("token", result.token);
    localStorage.setItem("user", JSON.stringify(result.user));
    setUser(result.user);
    setPendingTenants(null);
    applyTheme(result.user.theme);
  }

  function clearPendingTenants() {
    setPendingTenants(null);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setPendingTenants(null);
    window.location.href = "/login";
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isAdmin: user?.role === "ADMIN",
        pendingTenants,
        login,
        switchTenant,
        clearPendingTenants,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
