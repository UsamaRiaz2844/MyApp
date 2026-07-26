import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, usernameToEmail, pickAvatarColor } from '../lib/supabase';
import type { AuthUser } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  setAvatar: (url: string | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

async function loadProfile(userId: string, fallback: { username: string }): Promise<AuthUser> {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (data) {
    return {
      id: data.id,
      username: data.username,
      displayName: data.display_name || data.username,
      avatarColor: data.avatar_color || '#6366f1',
      avatarUrl: data.avatar_url || null,
    };
  }
  return { id: userId, username: fallback.username, displayName: fallback.username, avatarColor: pickAvatarColor(fallback.username) };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function init() {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (active && session?.user) {
        const usernameGuess = (session.user.user_metadata?.username as string) || session.user.email?.split('@')[0] || '';
        setToken(session.access_token);
        setUser(await loadProfile(session.user.id, { username: usernameGuess }));
      }
      if (active) setLoading(false);
    }
    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (session?.user) {
        setToken(session.access_token);
      } else {
        setToken(null);
        setUser(null);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function login(username: string, password: string) {
    const email = usernameToEmail(username);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(/invalid/i.test(error.message) ? 'Invalid username or password' : error.message);
    }
    setToken(data.session?.access_token || null);
    setUser(await loadProfile(data.user!.id, { username: username.trim().toLowerCase() }));
  }

  async function register(username: string, password: string) {
    const uname = username.trim().toLowerCase();
    if (!USERNAME_RE.test(uname)) {
      throw new Error('Username must be 3-20 characters: letters, numbers, underscore only');
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    // Pre-check username availability for a friendly message.
    const { data: taken } = await supabase.from('profiles').select('id').eq('username', uname).maybeSingle();
    if (taken) throw new Error('That username is already taken');

    const { data, error } = await supabase.auth.signUp({
      email: usernameToEmail(uname),
      password,
      options: { data: { username: uname, display_name: uname, avatar_color: pickAvatarColor(uname) } },
    });
    if (error) {
      throw new Error(/already registered/i.test(error.message) ? 'That username is already taken' : error.message);
    }
    if (!data.session) {
      // Happens when email confirmation is still enabled in the Supabase project.
      throw new Error('Account created, but sign-in is blocked. Turn OFF "Confirm email" in Supabase Auth settings.');
    }
    setToken(data.session.access_token);
    setUser(await loadProfile(data.user!.id, { username: uname }));
  }

  async function logout() {
    try {
      if (user) await supabase.from('profiles').update({ is_online: false, last_seen: new Date().toISOString() }).eq('id', user.id);
    } catch {
      /* ignore */
    }
    await supabase.auth.signOut();
    setToken(null);
    setUser(null);
  }

  function setAvatar(url: string | null) {
    setUser((prev) => (prev ? { ...prev, avatarUrl: url } : prev));
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, setAvatar }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
