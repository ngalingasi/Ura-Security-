/**
 * Format any date value to DD Mon YYYY for display (e.g. 24 May 2026).
 * Returns '—' for null/empty values.
 */
export const formatDate = (v: string | null | undefined): string => {
  if (!v) return '—';
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return v;
    return d.toLocaleDateString('en-GB', {
      day:   '2-digit',
      month: 'short',
      year:  'numeric',
    });
  } catch {
    return v;
  }
};

/**
 * Strip ISO datetime to plain YYYY-MM-DD for <input type="date">.
 * Returns '' for null/empty values.
 */
export const toDateInput = (v: string | null | undefined): string => {
  if (!v) return '';
  if (v.includes('T')) return v.slice(0, 10);
  return v;
};
