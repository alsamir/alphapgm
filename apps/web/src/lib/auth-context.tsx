'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { api, ApiError } from './api';

interface User {
  id: number;
  email: string;
  username: string;
  name?: string;
  roles: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; username: string; password: string; name?: string; phone?: string }) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    try {
      const res = await api.refreshToken();
      if (res.data?.accessToken) {
        setToken(res.data.accessToken);
        const meRes = await api.getMe(res.data.accessToken);
        setUser(meRes.data);
      }
    } catch {
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    if (res.data) {
      setToken(res.data.accessToken);
      setUser(res.data.user);
    }
  };

  const register = async (data: { email: string; username: string; password: string; name?: string; phone?: string }) => {
    const res = await api.register(data);
    if (res.data) {
      setToken(res.data.accessToken);
      setUser(res.data.user);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    // Call logout endpoint to clear refresh token cookie
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
