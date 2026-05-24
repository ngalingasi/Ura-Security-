import { useState } from 'react';
import DataTable, { type Column } from '../../../components/tables/DataTable';
import PageHeader from '../../../components/ui/PageHeader';
import StatusBadge from '../../../components/ui/StatusBadge';
import Modal from '../../../components/ui/Modal';
import { FormInput, FormTextarea, FormSelect, FormSection } from '../../../components/forms/FormField';

interface PostSite {
  id:         number;
  name:       string;
  client:     string;
  location:   string;
  guards:     number;
  supervisor: string;
  risk_level: string;
  status:     string;
}

const EMPTY = { name: '', client: '', location: '', guards: '', supervisor: '', shift: '', risk_level: 'medium', instructions: '', status: 'active' };

const SAMPLE: PostSite[] = [
  { id: 1, name: 'Main Branch',    client: 'Azania Bank Ltd',    location: 'Kariakoo, Dar es Salaam', guards: 4, supervisor: 'Juma Ally',   risk_level: 'high',   status: 'active'   },
  { id: 2, name: 'HQ Building',    client: 'CRDB Bank PLC',      location: 'Mwenge, Dar es Salaam',   guards: 2, supervisor: 'Mary John',   risk_level: 'medium', status: 'active'   },
  { id: 3, name: 'Arusha Office',  client: 'TanzaniaPost',       location: 'Kijenge, Arusha',         guards: 3, supervisor: 'Peter Said',  risk_level: 'low',    status: 'inactive' },
  { id: 4, name: 'Resort Grounds', client: 'Karibu Hotel Group', location: 'Mwanza City',             guards: 8, supervisor: 'Grace Mwita', risk_level: 'medium', status: 'active'   },
];

const CLIENT_OPTS = ['Azania Bank Ltd','CRDB Bank PLC','TanzaniaPost','Karibu Hotel Group','TANESCO'].map(v => ({ value: v, label: v }));
const SHIFT_OPTS  = ['Day Shift (06:00–18:00)','Night Shift (18:00–06:00)','24 Hours'].map(v => ({ value: v, label: v }));
const RISK_OPTS   = [{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }];

export default function PostSitesPage() {
  const [sites,     setSites]    = useState<PostSite[]>(SAMPLE);
  const [search,    setSearch]   = useState('');
  const [modal,     setModal]    = useState(false);
  const [editItem,  setEditItem] = useState<PostSite | null>(null);
  const [form,      setForm]     = useState({ ...EMPTY });
  const [saving,    setSaving]   = useState(false);
  const [errors,    setErrors]   = useState<Record<string,string>>({});

  const filtered = sites.filter(s => [s.name, s.client, s.location, s.supervisor].some(v => v.toLowerCase().includes(search.toLowerCase())));
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const openCreate = () => { setEditItem(null); setForm({ ...EMPTY }); setErrors({}); setModal(true); };
  const openEdit   = (s: PostSite) => {
    setEditItem(s);
    setForm({ name: s.name, client: s.client, location: s.location, guards: String(s.guards), supervisor: s.supervisor, shift: '', risk_level: s.risk_level, instructions: '', status: s.status });
    setErrors({}); setModal(true);
  };

  const validate = () => {
    const e: Record<string,string> = {};
    if (!form.name.trim())   e.name   = 'Post site name is required';
    if (!form.client)        e.client = 'Select a client';
    if (!form.location.trim()) e.location = 'Location is required';
    if (!form.guards || isNaN(Number(form.guards))) e.guards = 'Enter valid number';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    if (editItem) {
      setSites(prev => prev.map(s => s.id === editItem.id ? { ...s, ...form, guards: Number(form.guards) } : s));
    } else {
      setSites(prev => [...prev, { id: Date.now(), name: form.name, client: form.client, location: form.location, guards: Number(form.guards), supervisor: form.supervisor, risk_level: form.risk_level, status: form.status }]);
    }
    setSaving(false); setModal(false);
  };

  const columns: Column<PostSite>[] = [
    { key: 'name', header: 'Post Site', render: r => <div><p className="font-medium text-gray-800 dark:text-white">{r.name}</p><p className="text-xs text-gray-400">{r.location}</p></div> },
    { key: 'client', header: 'Client' },
    { key: 'guards', header: 'Guards', render: r => <span className="font-medium">{r.guards}</span> },
    { key: 'supervisor', header: 'Supervisor', className: 'hidden md:table-cell' },
    { key: 'risk_level', header: 'Risk', render: r => <StatusBadge status={r.risk_level} /> },
    { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status} /> },
    { key: '_a', header: '', render: r => <div className="flex gap-2 justify-end"><button onClick={() => openEdit(r)} className="text-xs text-brand-500 hover:text-brand-600 font-medium">Edit</button></div> },
  ];

  return (
    <div className="p-6 space-y-5">
      <PageHeader title="Post Sites" description={`${filtered.length} post sites`}
        action={<button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>New Post Site</button>}
      />
      <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search post sites..."
        className="h-10 w-full max-w-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-4 text-sm focus:border-brand-400 focus:outline-none dark:text-white" />
      <DataTable columns={columns} data={filtered} keyField="id" emptyText="No post sites found" />

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editItem ? 'Edit Post Site' : 'New Post Site'} size="md"
        footer={<><button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400">Cancel</button><button type="button" onClick={save} disabled={saving} className="px-5 py-2 text-sm font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button></>}
      >
        <div className="space-y-4">
          <FormSection title="Site Details">
            <FormInput label="Post Site Name" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Main Branch" error={errors.name} />
            <FormSelect label="Client" required options={CLIENT_OPTS} value={form.client} onChange={e => set('client', e.target.value)} placeholder="Select client" error={errors.client} />
            <FormInput label="Location" required value={form.location} onChange={e => set('location', e.target.value)} placeholder="Physical location" error={errors.location} />
          </FormSection>
          <FormSection title="Staffing & Schedule">
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="Guards Required" required type="number" min="1" value={form.guards} onChange={e => set('guards', e.target.value)} error={errors.guards} />
              <FormSelect label="Risk Level" options={RISK_OPTS} value={form.risk_level} onChange={e => set('risk_level', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="Site Supervisor" value={form.supervisor} onChange={e => set('supervisor', e.target.value)} placeholder="Full name" />
              <FormSelect label="Shift Details" options={SHIFT_OPTS} value={form.shift} onChange={e => set('shift', e.target.value)} placeholder="Select shift" />
            </div>
          </FormSection>
          <FormSection title="Other">
            <div className="grid grid-cols-2 gap-3">
              <FormSelect label="Status" options={[{value:'active',label:'Active'},{value:'inactive',label:'Inactive'}]} value={form.status} onChange={e => set('status', e.target.value)} />
            </div>
            <FormTextarea label="Instructions / Notes" value={form.instructions} onChange={e => set('instructions', e.target.value)} placeholder="Special instructions for guards..." rows={2} />
          </FormSection>
        </div>
      </Modal>
    </div>
  );
}
