import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// ── ERP Portal redirect handler ───────────────────────────────────────────────
// In production the ERP portal redirects here with:
//   ?token=<accessToken>&refreshToken=<refreshToken>
//
// We store tokens in localStorage BEFORE React mounts so AuthContext
// finds them on first render — user lands on dashboard, not login page.

const IS_PROD = import.meta.env.VITE_IS_PRODUCTION === 'true';

const handleErpRedirect = (): void => {
  const params       = new URLSearchParams(window.location.search);
  const token        = params.get('token');
  const refreshToken = params.get('refreshToken');

  if (!token) return;

  // Validate it's a real unexpired JWT
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp * 1000 < Date.now()) return;
  } catch {
    return;
  }

  // Store using the same keys AuthContext reads
  localStorage.setItem('access_token',  token);
  localStorage.setItem('refresh_token', refreshToken ?? '');

  // Pre-populate ura_user from JWT payload so AuthContext doesn't see null
  const existing = localStorage.getItem('ura_user');
  if (!existing) {
    try {
      const p = JSON.parse(atob(token.split('.')[1]));
      localStorage.setItem('ura_user', JSON.stringify({
        user_id: p.sub,
        email:   p.email ?? null,
        role:    p.role  ?? null,
      }));
    } catch { /* silent — AuthContext will call /auth/me */ }
  }

  // Clean URL — remove token params without reload
  params.delete('token');
  params.delete('refreshToken');
  const clean = window.location.pathname +
    (params.toString() ? `?${params.toString()}` : '') +
    window.location.hash;
  window.history.replaceState({}, '', clean);
};

// In production: handle ERP redirect params if present
if (IS_PROD) {
  handleErpRedirect();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
