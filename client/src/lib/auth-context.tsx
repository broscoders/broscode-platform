"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";

export type Role = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "SALES" | "DEVELOPER" | "DESIGNER" | "MARKETER";

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  isAdmin: boolean;
  canManageTeam: boolean;
  canManageFinance: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  isAdmin: false,
  canManageTeam: false,
  canManageFinance: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<CurrentUser>("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";
  const canManageTeam = isAdmin;
  const canManageFinance = isAdmin || user?.role === "MANAGER";

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, canManageTeam, canManageFinance }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}