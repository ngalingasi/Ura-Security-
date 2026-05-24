import { useState, useEffect, useCallback, useRef } from 'react';
import DataTable, { type Column } from '../../../components/tables/DataTable';
import PageHeader from '../../../components/ui/PageHeader';
import StatusBadge from '../../../components/ui/StatusBadge';
import Modal from '../../../components/ui/Modal';
import UserAvatar from '../../../components/ui/UserAvatar';
import { FormInput, FormTextarea, FormSelect, FormSection } from '../../../components/forms/FormField';
import { assignmentsApi, type Assignment } from '../api/assignments.api';
import { guardsApi, resolvePhotoUrl, type SecurityGuard } from '../../security-guards/api/guards.api';
import { clientsApi, type Client } from '../../clients/api/clients.api';
import { postSitesApi, type PostSite } from '../../post-sites/api/post-sites.api';
import { getErrorMessage } from '../../../api/client';

const SHIFT_OPTS = [
  { value:'Day Shift (06:00–18:00)',   label:'Day Shift (06:00–18:00)' },
  { value:'Night Shift (18:00–06:00)', label:'Night Shift (18:00–06:00)' },
  { value:'24 Hours',                  label:'24 Hours' },
];


/** Ensure a date value is plain YYYY-MM-DD for <input type="date"> */
const toDateInput = (v: string | null | undefined): string => {
  if (!v) return '';
  if (v.includes('T')) return v.slice(0, 10);
  return v;
};

const EMPTY = { guard_id:'', client_id:'', site_id:'', shift:'', start_date:'', end_date:'', notes:'' };

export default function AssignPostSitePage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [guards,      setGuards]      = useState<SecurityGuard[]>([]);
  const [clients,     setClients]     = useState<Client[]>([]);
  const [sites,       setSites]       = useState<PostSite[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [search,      setSearch]      = useState('');
  const [statusF,     setStatusF]     = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined as any);

  const [modal,    setModal]    = useState(false);
  const [form,     setForm]     = useState({ ...EMPTY });
  const [errors,   setErrors]   = useState<Record<string,string>>({});
  const [apiError, setApiError] = useState('');
  const [saving,   setSaving]   = useState(false);
  const [sitesLoading, setSitesLoading] = useState(false);

  // Load dropdowns once
  useEffect(() => {
    guardsApi.list({ limit: 200, guard_status: 'active' }).then(r => setGuards(r.data.results)).catch(() => {});
    clientsApi.list({ limit: 200, status: 'active' }).then(r => setClients(r.data.results)).catch(() => {});
  }, []);

  // When client changes, load its sites
  useEffect(() => {
    if (!form.client_id) { setSites([]); return; }
    setSitesLoading(true);
    postSitesApi.list({ client_id: Number(form.client_id), status: 'active', limit: 100 })
      .then(r => setSites(r.data.results))
      .catch(() => setSites([]))
      .finally(() => setSitesLoading(false));
  }, [form.client_id]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await assignmentsApi.list({
        page, limit: 12,
        search: search || undefined,
        status: statusF || undefined,
      });
      setAssignments(data.results);
      setTotal(data.totalResults);
    } catch { setAssignments([]); }
    finally  { setLoading(false); }
  }, [page, search, statusF]);

  useEffect(() => { load(); }, [load]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e: Record<string,string> = {};
    if (!form.guard_id)   e.guard_id   = 'Select a guard';
    if (!form.client_id)  e.client_id  = 'Select a client';
    if (!form.site_id)    e.site_id    = 'Select a post site';
    if (!form.shift)      e.shift      = 'Select a shift';
    if (!form.start_date) e.start_date = 'Start date is required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true); setApiError('');
    try {
      await assignmentsApi.create({
        guard_id:   Number(form.guard_id),
        client_id:  Number(form.client_id),
        site_id:    Number(form.site_id),
        shift:      form.shift,
        start_date: form.start_date,
        end_date:   form.end_date || undefined,
        notes:      form.notes    || undefined,
      });
      setModal(false);
      setForm({ ...EMPTY });
      load();
    } catch (err) {
      setApiError(getErrorMessage(err, 'Failed to create assignment'));
    } finally { setSaving(false); }
  };

  const endAssignment = async (id: number) => {
    if (!confirm('End this assignment?')) return;
    try {
      await assignmentsApi.end(id, 'Ended by manager');
      load();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const guardOpts  = guards.map(g => ({ value: String(g.guard_id), label: g.employee_id ? `${g.full_name} · ${g.employee_id}` : `${g.full_name} (${g.phone})` }));
  const clientOpts = clients.map(c => ({ value: String(c.client_id), label: c.name }));
  const siteOpts   = sites.map(s => ({ value: String(s.site_id), label: s.name }));

  const columns: Column<Assignment>[] = [
    { key: 'guard_name',  header: 'Guard',
      render: r => (
        <div className="flex items-center gap-2">
          <UserAvatar fullName={r.guard_name} role="guard" size="xs" />
          <span className="font-medium text-gray-800 dark:text-white">{r.guard_name}</span>
        </div>
      )
    },
    { key: 'client_name', header: 'Client',    className: 'hidden md:table-cell' },
    { key: 'site_name',   header: 'Post Site' },
    { key: 'shift',       header: 'Shift',     className: 'hidden lg:table-cell text-xs' },
    { key: 'start_date',  header: 'Start',     className: 'hidden md:table-cell text-xs' },
    { key: 'end_date',    header: 'End',       className: 'hidden lg:table-cell text-xs', render: r => <span>{r.end_date || '—'}</span> },
    { key: 'status',      header: 'Status',    render: r => <StatusBadge status={r.status} /> },
    {
      key: '_a', header: '',
      render: r => r.status === 'active' ? (
        <button onClick={() => endAssignment(r.assignment_id)}
          className="text-xs text-red-400 hover:text-red-600 font-medium whitespace-nowrap">
          End
        </button>
      ) : null,
    },
  ];

  // Stats
  const active    = assignments.filter(a => a.status === 'active').length;
  const completed = assignments.filter(a => a.status === 'completed').length;

  return (
    <div className="p-6 space-y-5">
      <PageHeader title="Assign Post Site" description={`${total} assignments`}
        action={<button onClick={() => { setForm({ ...EMPTY }); setErrors({}); setApiError(''); setModal(true); }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          New Assignment
        </button>}
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Active',    value: active,    color: 'text-green-600'  },
          { label: 'Completed', value: completed, color: 'text-gray-500'   },
          { label: 'Total',     value: total,     color: 'text-brand-600'  },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); clearTimeout(searchTimer.current); }}
          placeholder="Search assignments…"
          className="flex-1 min-w-[200px] h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-4 text-sm focus:border-brand-400 focus:outline-none dark:text-white" />
        <select value={statusF} onChange={e => { setStatusF(e.target.value); setPage(1); }}
          className="h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 text-sm focus:outline-none dark:text-white">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <DataTable columns={columns} data={assignments} loading={loading} keyField="assignment_id" emptyText="No assignments found" />

      {total > 12 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">{total} total</p>
          <div className="flex gap-2">
            <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-40">← Prev</button>
            <button disabled={page*12>=total} onClick={() => setPage(p=>p+1)} className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-40">Next →</button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={modal} onClose={() => setModal(false)} title="New Assignment" size="md"
        footer={<>
          <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400">Cancel</button>
          <button type="button" onClick={save} disabled={saving} className="px-5 py-2 text-sm font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 flex items-center gap-2">
            {saving && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
            {saving ? 'Assigning…' : 'Create Assignment'}
          </button>
        </>}
      >
        {apiError && <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-sm text-red-600 dark:text-red-400">{apiError}</div>}
        <div className="space-y-4">
          <FormSection title="Assignment Details">
            <FormSelect label="Security Guard" required options={guardOpts} value={form.guard_id}
              onChange={e => set('guard_id', e.target.value)} placeholder="Select guard" error={errors.guard_id} />
            <FormSelect label="Client" required options={clientOpts} value={form.client_id}
              onChange={e => { set('client_id', e.target.value); set('site_id', ''); }}
              placeholder="Select client" error={errors.client_id} />
            <FormSelect label="Post Site" required
              options={sitesLoading ? [{ value:'', label:'Loading…' }] : siteOpts.length ? siteOpts : [{ value:'', label: form.client_id ? 'No sites available' : 'Select client first' }]}
              value={form.site_id} onChange={e => set('site_id', e.target.value)}
              placeholder="Select post site" error={errors.site_id} />
            <FormSelect label="Shift" required options={SHIFT_OPTS} value={form.shift}
              onChange={e => set('shift', e.target.value)} placeholder="Select shift" error={errors.shift} />
          </FormSection>
          <FormSection title="Duration">
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="Start Date" required type="date" value={form.start_date}
                onChange={e => set('start_date', e.target.value)} error={errors.start_date} />
              <FormInput label="End Date" type="date" value={form.end_date}
                onChange={e => set('end_date', e.target.value)} hint="Leave blank for open-ended" />
            </div>
          </FormSection>
          <FormTextarea label="Notes" value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Special instructions…" />
        </div>
      </Modal>
    </div>
  );
}
