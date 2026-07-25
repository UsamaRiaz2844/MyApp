import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { AuthUser } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('pronto_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function restore() {
      const t = localStorage.getItem('pronto_token');
      const savedUser = localStorage.getItem('pronto_user');
      if (t && savedUser) {
        setToken(t);
        setUser(JSON.parse(savedUser));
      }
      setLoading(false);
    }
    restore();
  }, []);

  function persist(t: string, u: AuthUser) {
    localStorage.setItem('pronto_token', t);
    localStorage.setItem('pronto_user', JSON.stringify(u));
    setToken(t);
    setUser(u);
  }

  async function login(username: string, password: string) {
    const data = await api.login(username, password);
    persist(data.token, data.user);
  }

  async function register(username: string, password: string) {
    const data = await api.register(username, password);
    persist(data.token, data.user);
  }

  function logout() {
    localStorage.removeItem('pronto_token');
    localStorage.removeItem('pronto_user');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
