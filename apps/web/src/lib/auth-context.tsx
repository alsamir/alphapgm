'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { api, ApiError } from './api';

interface User {
  id: number;
  email: string;
  username: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  language?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string, turnstileToken?: string) => Promise<void>;
  register: (data: { email: string; username: string; password: string; firstName?: string; lastName?: string; name?: string; phone?: string; turnstileToken?: string }) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function normalizeUser(data: any): User | null {
  if (!data) return null;
  return {
    id: data.id || data.userId,
    email: data.email,
    username: data.username,
    name: data.name,
    firstName: data.firstName,
    lastName: data.lastName,
    roles: data.roles || [],
    language: data.language,
  };
}

function extractToken(data: any): string | null {
  return data?.tokens?.accessToken || data?.accessToken || null;
}

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('catapp_token');
}

function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem('catapp_user');
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function storeAuth(token: string | null, user: User | null) {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem('catapp_token', token);
  } else {
    localStorage.removeItem('catapp_token');
  }
  if (user) {
    localStorage.setItem('catapp_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('catapp_user');
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    try {
      // First try stored token
      const storedToken = getStoredToken();
      const storedUser = getStoredUser();
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);
        // Verify token is still valid
        try {
          const meRes = await api.getMe(storedToken);
          const meUser = normalizeUser(meRes.data);
          if (meUser) {
            setUser(meUser);
            storeAuth(storedToken, meUser);
          }
        } catch {
          // Token expired, try refresh
          try {
            const res = await api.refreshToken();
            const newToken = extractToken(res.data);
            if (newToken) {
              setToken(newToken);
              const meRes = await api.getMe(newToken);
              const meUser = normalizeUser(meRes.data);
              if (meUser) {
                setUser(meUser);
                storeAuth(newToken, meUser);
              }
            }
          } catch {
            setUser(null);
            setToken(null);
            storeAuth(null, null);
          }
        }
      } else {
        // No stored token, try refresh cookie
        try {
          const res = await api.refreshToken();
          const newToken = extractToken(res.data);
          if (newToken) {
            setToken(newToken);
            const meRes = await api.getMe(newToken);
            const meUser = normalizeUser(meRes.data);
            if (meUser) {
              setUser(meUser);
              storeAuth(newToken, meUser);
            }
          }
        } catch {
          setUser(null);
          setToken(null);
        }
      }
    } catch {
      setUser(null);
      setToken(null);
      storeAuth(null, null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  // Redirect to user's preferred language after auth resolves
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading || !user?.language) return;
    const preferredLang = user.language;
    // Only redirect if the preferred language is a valid locale and differs from current
    if (
      preferredLang !== locale &&
      routing.locales.includes(preferredLang as any)
    ) {
      const segments = pathname.split('/');
      if (routing.locales.includes(segments[1] as any)) {
        segments[1] = preferredLang;
      } else {
        segments.splice(1, 0, preferredLang);
      }
      const newPath = segments.join('/') || '/';
      router.replace(newPath);
    }
  }, [isLoading, user?.language]); // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (email: string, password: string, turnstileToken?: string) => {
    const res = await api.login(email, password, turnstileToken);
    if (res.data) {
      const accessToken = extractToken(res.data);
      const loginUser = normalizeUser(res.data.user);
      setToken(accessToken);
      setUser(loginUser);
      storeAuth(accessToken, loginUser);
    }
  };

  const register = async (data: { email: string; username: string; password: string; firstName?: string; lastName?: string; name?: string; phone?: string; turnstileToken?: string }) => {
    const res = await api.register(data);
    if (res.data) {
      const accessToken = extractToken(res.data);
      const regUser = normalizeUser(res.data.user);
      setToken(accessToken);
      setUser(regUser);
      storeAuth(accessToken, regUser);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    storeAuth(null, null);
    fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        isAdmin: user?.roles?.includes('ROLE_ADMIN') || false,
        login,
        register,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
