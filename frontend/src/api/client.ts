/**
 * Central API client
 * All modules import from here — no circular deps, single axios instance
 */
import client from '../auth/api/authApi';
export default client;

// ── Response types ─────────────────────────────────────────────────────────────
export interface PaginatedResult<T> {
  results:      T[];
  page:         number;
  limit:        number;
  totalPages:   number;
  totalResults: number;
}

// ── Error extractor ─────────────────────────────────────────────────────────────
export const getErrorMessage = (err: unknown, fallback = 'Something went wrong'): string => {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as any).response?.data;
    return res?.message || res?.error || fallback;
  }
  return fallback;
};
