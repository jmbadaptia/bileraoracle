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
  position?: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setIsLoading(false);
      return;
    }

    api
      .get<{ user: User }>("/auth/me")
      .then(({ user }) => {
        setUser(user);
        localStorage.setItem("user", JSON.stringify(user));
      })
      .catch(() => {
        setUser(null);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const { token, user } = await api.post<{ token: string; user: User }>(
      "/auth/login",
      { email, password }
    );
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    setUser(user);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    window.location.href = "/login";
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isAdmin: user?.role === "ADMIN",
        login,
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
