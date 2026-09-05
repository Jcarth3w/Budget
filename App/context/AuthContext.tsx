import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError, setOnUnauthorized } from "@/utils/api";
import { clearToken, getToken, setToken } from "@/utils/tokenStorage";

export type AuthUser = {
  id: string;
  email: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthResponse = {
  token?: string;
  user?: AuthUser;
};

async function authenticate(path: string, email: string, password: string) {
  const json = await apiFetch<AuthResponse>(path, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (!json.token || !json.user) {
    throw new Error("Unexpected auth response");
  }
  await setToken(json.token);
  return json.user;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  const logout = useCallback(async () => {
    await clearToken();
    setUser(null);
  }, []);

  useEffect(() => {
    setOnUnauthorized(() => {
      logout().catch(() => {});
    });
    return () => setOnUnauthorized(null);
  }, [logout]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const json = await apiFetch<{ user?: AuthUser }>("/auth/me");
        if (!cancelled && json.user) setUser(json.user);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          await clearToken();
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const next = await authenticate("/auth/login", email, password);
    setUser(next);
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const next = await authenticate("/auth/register", email, password);
    setUser(next);
  }, []);

  const value = useMemo(
    () => ({ user, ready, login, register, logout }),
    [user, ready, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
