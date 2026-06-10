import { useState, useEffect, type ReactNode } from 'react';
import { AuthContext } from '../store/authStore';
import type { User } from '../types';

// ── Environment ───────────────────────────────────────────────────────────────
const IS_PROD       = import.meta.env.VITE_IS_PRODUCTION === 'true';
const ERP_PORTAL    = 'https://erp.tpfcs.co.tz';
const ERP_DASHBOARD = `${ERP_PORTAL}/dashboard`;

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

        if (stored && token && !isTokenExpired(token)) {
          const parsed: User = JSON.parse(stored);
          setUser(parsed);

          // If user came from ERP redirect, ura_user may be minimal (just sub/email/role).
          // Fetch full profile from /auth/me to enrich it silently.
          const isMinimal = !parsed.full_name && !parsed.username;
          if (isMinimal) {
            try {
              const base = import.meta.env.VITE_API_URL ?? '/api';
              const res  = await fetch(`${base}/v1/auth/me`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                const full: User = await res.json();
                localStorage.setItem(STORAGE_USER, JSON.stringify(full));
                setUser(full);
              }
            } catch { /* silent — use minimal user */ }
          }
        } else {
          localStorage.removeItem(STORAGE_USER);
          localStorage.removeItem(STORAGE_ACCESS);
          localStorage.removeItem(STORAGE_REFRESH);
        }
      } catch {
        localStorage.clear();
      } finally {
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

    if (IS_PROD) {
      // Production — return user to ERP portal dashboard
      window.location.href = ERP_DASHBOARD;
    }
    // Development — React Router handles redirect to /signin via ProtectedRoute
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
