import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// ── ERP token handler ─────────────────────────────────────────────────────────
// Always overwrites ura_user on ERP redirect — never use stale cached data
// when fresh token+user is incoming from the ERP portal.
const handleErpRedirect = (): void => {
  const params       = new URLSearchParams(window.location.search);
  const token        = params.get('token');
  const refreshToken = params.get('refreshToken');
  if (!token) return;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp * 1000 < Date.now()) return;

    // Always overwrite — incoming token has the authoritative user data
    localStorage.setItem('access_token',  token);
    localStorage.setItem('refresh_token', refreshToken ?? '');
    localStorage.setItem('ura_user', JSON.stringify({
      user_id:              Number(payload.sub) || 0,
      full_name:            payload.full_name ?? payload.email ?? 'User',
      username:             payload.username  ?? payload.email ?? 'user',
      email:                payload.email     ?? '',
      role:                 payload.role      ?? 'user',
      status:               'active',
      must_change_password: Number(payload.must_change_password ?? 0),
    }));

    // Clean URL
    params.delete('token');
    params.delete('refreshToken');
    const clean = window.location.pathname +
      (params.toString() ? `?${params.toString()}` : '') +
      window.location.hash;
    window.history.replaceState({}, '', clean);
  } catch { /* invalid token — ignore */ }
};

handleErpRedirect();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
