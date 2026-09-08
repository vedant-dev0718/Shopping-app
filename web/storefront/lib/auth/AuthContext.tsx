"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { getMe, login as apiLogin, logout as apiLogout, type User } from "@/lib/api/auth";

type AuthContextValue = {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setSession: (token: string, user: User) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "notwhat_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setIsLoading(false);
      return;
    }
    getMe(stored)
      .then(({ user }) => {
        setToken(stored);
        setUser(user);
      })
      .catch(() => {
        window.localStorage.removeItem(STORAGE_KEY);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const setSession = useCallback((newToken: string, newUser: User) => {
    window.localStorage.setItem(STORAGE_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const payload = await apiLogin(identifier, password);
      setSession(payload.token, payload.user);
    },
    [setSession],
  );

  const logout = useCallback(async () => {
    if (token) {
      await apiLogout(token).catch(() => {});
    }
    window.localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, [token]);

  return (
    <AuthContext.Provider value={{ token, user, isLoading, login, logout, setSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
