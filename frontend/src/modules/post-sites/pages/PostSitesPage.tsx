import { useState, useEffect, useCallback, useRef } from 'react';
import DataTable, { type Column } from '../../../components/tables/DataTable';
import PageHeader from '../../../components/ui/PageHeader';
import StatusBadge from '../../../components/ui/StatusBadge';
import Modal from '../../../components/ui/Modal';
import { FormInput, FormTextarea, FormSelect, FormSection } from '../../../components/forms/FormField';
import { postSitesApi, type PostSite } from '../api/post-sites.api';
import { clientsApi, type Client } from '../../clients/api/clients.api';
import { getErrorMessage } from '../../../api/client';

const SHIFT_OPTS = [
  { value:'Day Shift (06:00–18:00)', label:'Day Shift (06:00–18:00)' },
  { value:'Night Shift (18:00–06:00)', label:'Night Shift (18:00–06:00)' },
  { value:'24 Hours', label:'24 Hours' },
];
const RISK_OPTS = [
  { value:'low', label:'Low' },
  { value:'medium', label:'Medium' },
  { value:'high', label:'High' },
];

const EMPTY = { client_id:'', name:'', location:'', guards_required:'1', shift_details:'', supervisor_name:'', risk_level:'medium', instructions:'', status:'active' };

export default function PostSitesPage() {
  const [sites,   setSites]   = useState<PostSite[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [search,  setSearch]  = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined as any);

  const [modal,    setModal]    = useState(false);
  const [editItem, setEditItem] = useState<PostSite | null>(null);
  const [form,     setForm]     = useState({ ...EMPTY });
  const [errors,   setErrors]   = useState<Record<string,string>>({});
  const [apiError, setApiError] = useState('');
  const [saving,   setSaving]   = useState(false);

  // Load clients for dropdown once
  useEffect(() => {
    clientsApi.list({ limit: 100, status: 'active' })
      .then(r => setClients(r.data.results))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await postSitesApi.list({
        page, limit: 12,
        search: search || undefined,
        client_id: clientFilter ? Number(clientFilter) : undefined,
      });
      setSites(data.results);
      setTotal(data.totalResults);
    } catch { setSites([]); }
    finally  { setLoading(false); }
  }, [page, search, clientFilter]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (val: string) => {
    setSearch(val); setPage(1);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {}, 0);
  };

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const openCreate = () => { setEditItem(null); setForm({ ...EMPTY }); setErrors({}); setApiError(''); setModal(true); };
  const openEdit   = (s: PostSite) => {
    setEditItem(s);
    setForm({
      client_id: String(s.client_id), name: s.name, location: s.location,
      guards_required: String(s.guards_required), shift_details: s.shift_details ?? '',
      supervisor_name: s.supervisor_name ?? '', risk_level: s.risk_level,
      instructions: s.instructions ?? '', status: s.status,
    });
    setErrors({}); setApiError(''); setModal(true);
  };

  const validate = () => {
    const e: Record<string,string> = {};
    if (!form.client_id)         e.client_id       = 'Select a client';
    if (!form.name.trim())       e.name            = 'Post site name is required';
    if (!form.location.trim())   e.location        = 'Location is required';
    if (!form.guards_required || isNaN(Number(form.guards_required))) e.guards_required = 'Enter valid number';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true); setApiError('');
    try {
      const payload: Record<string, any> = {
        ...form,
        client_id: Number(form.client_id),
        guards_required: Number(form.guards_required),
        shift_details: form.shift_details || null,
        supervisor_name: form.supervisor_name || null,
        instructions: form.instructions || null,
      };
      if (editItem) await postSitesApi.update(editItem.site_id, payload);
      else          await postSitesApi.create(payload);
      setModal(false); load();
    } catch (err) {
      setApiError(getErrorMessage(err, 'Failed to save post site'));
    } finally { setSaving(false); }
  };

  const clientOpts = clients.map(c => ({ value: String(c.client_id), label: c.name }));

  const columns: Column<PostSite>[] = [
    { key: 'name', header: 'Post Site',
      render: r => <div><p className="font-medium text-gray-800 dark:text-white">{r.name}</p><p className="text-xs text-gray-400">{r.location}</p></div> },
    { key: 'client_name', header: 'Client' },
    { key: 'guards_required', header: 'Guards', render: r => <span className="font-medium">{r.guards_required}</span> },
    { key: 'supervisor_name', header: 'Supervisor', className: 'hidden md:table-cell' },
    { key: 'risk_level', header: 'Risk', render: r => <StatusBadge status={r.risk_level} /> },
    { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status} /> },
    { key: '_a', header: '',
      render: r => <div className="flex gap-3 justify-end">
        <button onClick={() => openEdit(r)} className="text-xs text-brand-500 hover:text-brand-600 font-medium">Edit</button>
        <button onClick={async () => { if (confirm(`Deactivate "${r.name}"?`)) { await postSitesApi.deactivate(r.site_id); load(); } }} className="text-xs text-red-400 hover:text-red-600 font-medium">Delete</button>
      </div>
    },
  ];

  return (
    <div className="p-6 space-y-5">
      <PageHeader title="Post Sites" description={`${total} sites`}
        action={<button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          New Post Site
        </button>}
      />
      <div className="flex gap-2 flex-wrap">
        <input type="text" value={search} onChange={e => handleSearch(e.target.value)} placeholder="Search post sites…"
          className="flex-1 min-w-[180px] h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-4 text-sm focus:border-brand-400 focus:outline-none dark:text-white" />
        <select value={clientFilter} onChange={e => { setClientFilter(e.target.value); setPage(1); }}
          className="h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 text-sm focus:outline-none dark:text-white">
          <option value="">All Clients</option>
          {clientOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <DataTable columns={columns} data={sites} loading={loading} keyField="site_id" emptyText="No post sites found" />
      {total > 12 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">{total} total</p>
          <div className="flex gap-2">
            <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-40">← Prev</button>
            <button disabled={page*12>=total} onClick={() => setPage(p=>p+1)} className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-40">Next →</button>
          </div>
        </div>
      )}

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editItem ? 'Edit Post Site' : 'New Post Site'} size="md"
        footer={<>
          <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400">Cancel</button>
          <button type="button" onClick={save} disabled={saving} className="px-5 py-2 text-sm font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 flex items-center gap-2">
            {saving && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>}
      >
        {apiError && <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-sm text-red-600 dark:text-red-400">{apiError}</div>}
        <div className="space-y-4">
          <FormSection title="Site Details">
            <FormInput label="Post Site Name" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Main Branch" error={errors.name} />
            <FormSelect label="Client" required options={clientOpts} value={form.client_id} onChange={e => set('client_id', e.target.value)} placeholder="Select client" error={errors.client_id} />
            <FormInput label="Location" required value={form.location} onChange={e => set('location', e.target.value)} placeholder="Physical location" error={errors.location} />
          </FormSection>
          <FormSection title="Staffing & Schedule">
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="Guards Required" required type="number" min="1" value={form.guards_required} onChange={e => set('guards_required', e.target.value)} error={errors.guards_required} />
              <FormSelect label="Risk Level" options={RISK_OPTS} value={form.risk_level} onChange={e => set('risk_level', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="Site Supervisor" value={form.supervisor_name} onChange={e => set('supervisor_name', e.target.value)} placeholder="Full name" />
              <FormSelect label="Shift Details" options={SHIFT_OPTS} value={form.shift_details} onChange={e => set('shift_details', e.target.value)} placeholder="Select shift" />
            </div>
          </FormSection>
          <FormSection title="Other">
            <FormSelect label="Status" options={[{value:'active',label:'Active'},{value:'inactive',label:'Inactive'}]} value={form.status} onChange={e => set('status', e.target.value)} />
            <FormTextarea label="Instructions / Notes" value={form.instructions} onChange={e => set('instructions', e.target.value)} placeholder="Special instructions…" rows={2} />
          </FormSection>
        </div>
      </Modal>
    </div>
  );
}
