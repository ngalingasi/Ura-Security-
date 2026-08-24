/**
 * Reference Data  —  /hr/reference-data
 *
 * Management UI for the simple name-only HR lookup tables: Designations,
 * Titles, and Banks. (Departments has its own dedicated page since it
 * carries extra fields — region, usercount, etc.)
 *
 * These tables previously had GET-only endpoints (used to populate
 * dropdowns) with no way to actually create entries anywhere in the
 * UI — this page is what's now backing:
 *   GET    /v1/hr/masters/designations | /titles | /banks
 *   POST   /v1/hr/masters/designations | /titles | /banks   {payload}
 *   DELETE /v1/hr/masters/designations | /titles | /banks   ?xxx_id=
 */
import { useEffect, useState, useCallback } from 'react';
import client from '../../../api/client';
import PageShell from '../components/ui/PageShell';

const inCls  = 'w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-white focus:outline-none focus:border-brand-400 placeholder-gray-400';
const lblCls = 'block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5';

interface Toast { msg: string; type: 'success' | 'error'; }

interface EntityConfig {
  key: 'designations' | 'titles' | 'banks';
  label: string;          // "Designation"
  labelPlural: string;    // "Designations"
  idField: string;        // "designation_id"
  nameField: string;      // "designation_name"
  placeholder: string;
}

const ENTITIES: EntityConfig[] = [
  { key: 'designations', label: 'Designation', labelPlural: 'Designations', idField: 'designation_id', nameField: 'designation_name', placeholder: 'e.g. Site Supervisor' },
  { key: 'titles',       label: 'Title',       labelPlural: 'Titles',       idField: 'title_id',       nameField: 'title_name',       placeholder: 'e.g. Mr, Mrs, Dr' },
  { key: 'banks',        label: 'Bank',        labelPlural: 'Banks',        idField: 'bank_id',        nameField: 'bank_name',        placeholder: 'e.g. CRDB Bank' },
];

function EntityTab({ config, toast }: { config: EntityConfig; toast: (t: Toast) => void }) {
  const [items,   setItems]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name,    setName]    = useState('');
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [search,  setSearch]  = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await client.get(`/v1/hr/masters/${config.key}`);
      setItems(r.data?.data ?? []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, [config.key]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError(`${config.label} name is required`); return; }
    setSaving(true); setError('');
    try {
      const r = await client.post(`/v1/hr/masters/${config.key}`, { payload: { [config.nameField]: name.trim() } });
      if (r.data?.status) {
        setName('');
        load();
        toast({ msg: `${config.label} added`, type: 'success' });
      } else {
        setError(r.data?.message || 'Failed to add');
      }
    } catch (ex: any) {
      setError(ex?.response?.data?.message || 'Error');
    } finally { setSaving(false); }
  };

  const handleDelete = async (item: any) => {
    const id = item[config.idField];
    if (!confirm(`Delete "${item[config.nameField]}"?`)) return;
    try {
      const r = await client.delete(`/v1/hr/masters/${config.key}?${config.idField}=${id}`);
      if (r.data?.status) {
        load();
        toast({ msg: `${config.label} deleted`, type: 'success' });
      } else {
        toast({ msg: r.data?.message || 'Failed to delete', type: 'error' });
      }
    } catch (ex: any) {
      toast({ msg: ex?.response?.data?.message || 'Cannot delete — in use', type: 'error' });
    }
  };

  const filtered = search
    ? items.filter(i => String(i[config.nameField] || '').toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Add form */}
      <div className="lg:col-span-1">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4">Add {config.label}</h3>
          <form onSubmit={handleAdd} className="space-y-3">
            {error && <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 text-xs text-red-600 dark:text-red-400">{error}</div>}
            <div>
              <label className={lblCls}>{config.label} Name<span className="text-red-500 ml-0.5">*</span></label>
              <input value={name} onChange={e => { setName(e.target.value); setError(''); }} placeholder={config.placeholder} className={inCls}/>
            </div>
            <button type="submit" disabled={saving}
              className="w-full h-10 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold disabled:opacity-50">
              {saving ? 'Saving…' : `Add ${config.label}`}
            </button>
          </form>
        </div>
      </div>

      {/* List */}
      <div className="lg:col-span-2">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${config.labelPlural.toLowerCase()}…`} className={inCls}/>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
                <th className="px-4 py-2.5 text-left font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">{config.label}</th>
                <th className="px-4 py-2.5 text-left font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">In Use</th>
                <th className="px-4 py-2.5 text-right font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-32"/></td>
                      <td className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-10"/></td>
                      <td className="px-4 py-3"/>
                    </tr>
                  ))
                : filtered.length === 0
                ? <tr><td colSpan={3} className="px-4 py-10 text-center text-gray-400 text-sm">No {config.labelPlural.toLowerCase()} yet</td></tr>
                : filtered.map(item => (
                    <tr key={item[config.idField]} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-white">{item[config.nameField]}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.usercount ?? 0}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleDelete(item)}
                          className="px-2.5 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md font-medium">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function ReferenceDataPage() {
  const [tab, setTab] = useState<EntityConfig['key']>('designations');
  const [toast, setToast] = useState<Toast>({ msg: '', type: 'success' });
  const showToast = (t: Toast) => { setToast(t); setTimeout(() => setToast({ msg: '', type: 'success' }), 3000); };
  const active = ENTITIES.find(e => e.key === tab)!;

  return (
    <PageShell title="Reference Data" subtitle="Designations, titles, and banks used across HR & Payroll">
      {toast.msg && (
        <div className={`mb-4 p-3 rounded-xl text-sm ${toast.type === 'success' ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 gap-1">
        {ENTITIES.map(e => (
          <button key={e.key} onClick={() => setTab(e.key)}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
              tab === e.key
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}>
            {e.labelPlural}
          </button>
        ))}
      </div>

      <EntityTab key={active.key} config={active} toast={showToast}/>
    </PageShell>
  );
}
