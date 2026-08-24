import { useEffect, useRef, useState } from 'react';
import client from '../../../../api/client';

export interface RosterPerson {
  person_type: 'user' | 'guard';
  person_id: number;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  status?: string | null;
  photo_url?: string | null;
  department_name?: string | null;
  designation_name?: string | null;
}

interface Props {
  label?: string;
  required?: boolean;
  value: RosterPerson | null;
  onChange: (person: RosterPerson | null) => void;
  placeholder?: string;
}

/**
 * Combined picker for "which person" — searches both URA's `users` and
 * `security_guards` tables together via GET /v1/hr/roster. Used
 * anywhere the old ported pages assumed a single flat employee list
 * (Leave applicant, Payroll salary assignment, Attendance filter).
 */
export default function PersonPicker({ label, required, value, onChange, placeholder = 'Search staff or guard by name…' }: Props) {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState<RosterPerson[]>([]);
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(() => {
      setLoading(true);
      client.get('/v1/hr/roster', { params: { search: query } })
        .then((r) => setResults(r.data?.data ?? []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const select = (p: RosterPerson) => {
    onChange(p);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={boxRef} className="relative">
      {label && (
        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      {value ? (
        <div className="flex items-center justify-between h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${value.person_type === 'guard' ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400'}`}>
              {value.person_type === 'guard' ? 'Guard' : 'Staff'}
            </span>
            <span className="truncate text-gray-800 dark:text-white">{value.full_name}</span>
          </div>
          <button type="button" onClick={() => onChange(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      ) : (
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:border-brand-400"
        />
      )}

      {open && !value && (query.trim() || loading) && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
          {loading && <div className="px-3 py-2 text-xs text-gray-400">Searching…</div>}
          {!loading && results.length === 0 && query.trim() && (
            <div className="px-3 py-2 text-xs text-gray-400">No matches</div>
          )}
          {results.map((p) => (
            <button
              type="button"
              key={`${p.person_type}-${p.person_id}`}
              onClick={() => select(p)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2"
            >
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${p.person_type === 'guard' ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400'}`}>
                {p.person_type === 'guard' ? 'Guard' : 'Staff'}
              </span>
              <span className="truncate text-gray-800 dark:text-white">{p.full_name}</span>
              {p.department_name && <span className="text-xs text-gray-400 ml-auto flex-shrink-0">{p.department_name}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
