/**
 * File URL helper for the HR module.
 *
 * Vibarua/Bandari served employee photos/documents through Apache-proxied
 * `/cdn-image/:filename` and `/documents/:filename` paths (see the
 * original `getCdnImageUrl` / `getDocumentUrl` in its authApi.ts).
 * URA's backend instead serves uploads statically at `/uploads/<subdir>`
 * (see backend `src/app.js` and `src/routes/hr.routes.js`, which saves
 * HR attachments to `uploads/hr-attachments/`).
 *
 * This file only adapts the URL construction to URA's static-file
 * layout — it does not change any business logic in the ported pages
 * that call it.
 */

// The API base already includes `/api`; strip it to get the bare server
// origin that `/uploads` is served from.
const API_BASE: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';
const SERVER_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

export const getHrFileUrl = (filename?: string | null): string | null =>
  filename ? `${SERVER_ORIGIN}/uploads/hr-attachments/${encodeURIComponent(filename)}` : null;

// Kept as an alias so ported pages that used `getCdnImageUrl` /
// `getDocumentUrl` need only change their import, not the call sites.
export const getCdnImageUrl = getHrFileUrl;
export const getDocumentUrl = getHrFileUrl;
