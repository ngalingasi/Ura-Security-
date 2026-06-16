import { useState, useEffect, type ReactNode } from 'react';
import { AuthContext } from '../store/authStore';
import type { User } from '../types';

const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};

const STORAGE_USER    = 'ura_user';
const STORAGE_ACCESS  = 'access_token';
const STORAGE_REFRESH = 'refresh_token';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user,      setUser]      = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const stored = localStorage.getItem(STORAGE_USER);
        const token  = localStorage.getItem(STORAGE_ACCESS);

        if (!token || isTokenExpired(token)) {
          localStorage.removeItem(STORAGE_USER);
          localStorage.removeItem(STORAGE_ACCESS);
          localStorage.removeItem(STORAGE_REFRESH);
          setIsLoading(false);
          return;
        }

        // Set user immediately from storage so UI renders fast
        if (stored) {
          try {
            setUser(JSON.parse(stored));
          } catch { /* ignore parse error */ }
        }
        setIsLoading(false);

        // Background: always refresh from /auth/me to get live role + profile
        // This ensures role is correct even if localStorage had stale data
        try {
          const base = import.meta.env.VITE_API_URL ?? '/api';
          const res  = await fetch(`${base}/v1/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const fresh: User = await res.json();
            if (fresh?.user_id) {
              localStorage.setItem(STORAGE_USER, JSON.stringify(fresh));
              setUser(fresh);
            }
          }
        } catch { /* silent — use stored user */ }

      } catch {
        localStorage.removeItem(STORAGE_USER);
        localStorage.removeItem(STORAGE_ACCESS);
        localStorage.removeItem(STORAGE_REFRESH);
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const login = (u: User, accessToken: string, refreshToken: string) => {
    localStorage.setItem(STORAGE_USER,    JSON.stringify(u));
    localStorage.setItem(STORAGE_ACCESS,  accessToken);
    localStorage.setItem(STORAGE_REFRESH, refreshToken);
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_USER);
    localStorage.removeItem(STORAGE_ACCESS);
    localStorage.removeItem(STORAGE_REFRESH);
    setUser(null);
  };

  const updateUser = (partial: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...partial };
    localStorage.setItem(STORAGE_USER, JSON.stringify(updated));
    setUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isSuperAdmin: user?.role === 'super_admin',
        isAdmin:      user?.role === 'admin' || user?.role === 'super_admin',
        isManager:    user?.role === 'manager' || user?.role === 'admin' || user?.role === 'super_admin',
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
