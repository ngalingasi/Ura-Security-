import { useState } from 'react';
import DataTable, { type Column } from '../../../components/tables/DataTable';
import PageHeader from '../../../components/ui/PageHeader';
import StatusBadge from '../../../components/ui/StatusBadge';
import Modal from '../../../components/ui/Modal';
import { FormInput, FormTextarea, FormSelect, FormSection } from '../../../components/forms/FormField';

interface Assignment {
  id:         number;
  guard:      string;
  client:     string;
  site:       string;
  shift:      string;
  start_date: string;
  end_date:   string;
  status:     string;
  notes:      string;
}

const EMPTY = { guard: '', client: '', site: '', shift: '', start_date: '', end_date: '', notes: '' };

const SAMPLE: Assignment[] = [
  { id:1, guard:'Hassan Juma Ally',   client:'Azania Bank Ltd',    site:'Main Branch',    shift:'Day Shift',   start_date:'2024-01-01', end_date:'2024-12-31', status:'active',   notes:'' },
  { id:2, guard:'Grace Peter Mwita',  client:'Karibu Hotel Group', site:'Resort Grounds', shift:'Night Shift',  start_date:'2023-08-10', end_date:'2024-08-09', status:'active',   notes:'' },
  { id:3, guard:'Juma Mohammed Said', client:'TanzaniaPost',       site:'Arusha Office',  shift:'Day Shift',   start_date:'2021-06-01', end_date:'2022-05-31', status:'inactive', notes:'Contract ended' },
  { id:4, guard:'Ali Rashid Hamad',   client:'CRDB Bank PLC',      site:'HQ Building',    shift:'24 Hours',    start_date:'2022-11-01', end_date:'',            status:'active',   notes:'' },
];

const GUARD_OPTS  = ['Hassan Juma Ally','Grace Peter Mwita','Juma Mohammed Said','Mary Michael Shuma','Ali Rashid Hamad'].map(v => ({ value: v, label: v }));
const CLIENT_OPTS = ['Azania Bank Ltd','CRDB Bank PLC','TanzaniaPost','Karibu Hotel Group','TANESCO'].map(v => ({ value: v, label: v }));
const SITE_MAP: Record<string, string[]> = {
  'Azania Bank Ltd':    ['Main Branch'],
  'CRDB Bank PLC':      ['HQ Building'],
  'TanzaniaPost':       ['Arusha Office'],
  'Karibu Hotel Group': ['Resort Grounds'],
  'TANESCO':            [],
};
const SHIFT_OPTS = ['Day Shift (06:00–18:00)','Night Shift (18:00–06:00)','24 Hours'].map(v => ({ value: v, label: v }));

export default function AssignPostSitePage() {
  const [assignments, setAssignments] = useState<Assignment[]>(SAMPLE);
  const [search, setSearch]  = useState('');
  const [modal,  setModal]   = useState(false);
  const [form,   setForm]    = useState({ ...EMPTY });
  const [saving, setSaving]  = useState(false);
  const [errors, setErrors]  = useState<Record<string,string>>({});

  const filtered = assignments.filter(a =>
    [a.guard, a.client, a.site].some(v => v.toLowerCase().includes(search.toLowerCase()))
  );

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // Check for duplicate active assignment
  const isDuplicate = () => assignments.some(a =>
    a.guard === form.guard && a.site === form.site && a.status === 'active'
  );

  const validate = () => {
    const e: Record<string,string> = {};
    if (!form.guard)      e.guard      = 'Select a guard';
    if (!form.client)     e.client     = 'Select a client';
    if (!form.site)       e.site       = 'Select a post site';
    if (!form.shift)      e.shift      = 'Select a shift';
    if (!form.start_date) e.start_date = 'Start date is required';
    if (isDuplicate())    e.guard      = 'This guard is already assigned to this site';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setAssignments(prev => [...prev, { id: Date.now(), ...form, status: 'active' }]);
    setSaving(false); setModal(false); setForm({ ...EMPTY });
  };

  const siteOpts = (SITE_MAP[form.client] ?? []).map(v => ({ value: v, label: v }));

  const columns: Column<Assignment>[] = [
    { key: 'guard',      header: 'Guard',    render: r => <span className="font-medium text-gray-800 dark:text-white">{r.guard}</span> },
    { key: 'client',     header: 'Client',   className: 'hidden md:table-cell' },
    { key: 'site',       header: 'Post Site' },
    { key: 'shift',      header: 'Shift',    className: 'hidden lg:table-cell text-xs' },
    { key: 'start_date', header: 'Start',    className: 'hidden md:table-cell text-xs' },
    { key: 'end_date',   header: 'End',      className: 'hidden lg:table-cell text-xs', render: r => <span>{r.end_date || '—'}</span> },
    { key: 'status',     header: 'Status',   render: r => <StatusBadge status={r.status} /> },
    {
      key: '_a', header: '',
      render: r => r.status === 'active' ? (
        <button
          onClick={() => setAssignments(prev => prev.map(a => a.id === r.id ? { ...a, status: 'inactive', end_date: new Date().toISOString().slice(0,10) } : a))}
          className="text-xs text-red-400 hover:text-red-600 font-medium whitespace-nowrap"
        >
          End
        </button>
      ) : null,
    },
  ];

  return (
    <div className="p-6 space-y-5">
      <PageHeader title="Assign Post Site" description={`${filtered.length} assignments`}
        action={<button onClick={() => { setForm({ ...EMPTY }); setErrors({}); setModal(true); }} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>New Assignment</button>}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Active Assignments', value: assignments.filter(a => a.status === 'active').length,   color: 'text-green-600' },
          { label: 'Past Assignments',   value: assignments.filter(a => a.status !== 'active').length,   color: 'text-gray-500'  },
          { label: 'Total',              value: assignments.length,                                       color: 'text-brand-600' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assignments..."
        className="h-10 w-full max-w-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-4 text-sm focus:border-brand-400 focus:outline-none dark:text-white" />

      <DataTable columns={columns} data={filtered} keyField="id" emptyText="No assignments found" />

      {/* Assignment Modal */}
      <Modal isOpen={modal} onClose={() => setModal(false)} title="New Assignment" size="md"
        footer={<><button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400">Cancel</button><button type="button" onClick={save} disabled={saving} className="px-5 py-2 text-sm font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50">{saving ? 'Assigning...' : 'Create Assignment'}</button></>}
      >
        <div className="space-y-4">
          <FormSection title="Assignment Details">
            <FormSelect label="Security Guard" required options={GUARD_OPTS} value={form.guard} onChange={e => set('guard', e.target.value)} placeholder="Select guard" error={errors.guard} />
            <FormSelect label="Client" required options={CLIENT_OPTS} value={form.client} onChange={e => { set('client', e.target.value); set('site', ''); }} placeholder="Select client" error={errors.client} />
            <FormSelect
              label="Post Site" required
              options={siteOpts.length ? siteOpts : []}
              value={form.site}
              onChange={e => set('site', e.target.value)}
              placeholder={form.client ? (siteOpts.length ? 'Select site' : 'No sites for this client') : 'Select client first'}
              error={errors.site}
            />
            <FormSelect label="Shift" required options={SHIFT_OPTS} value={form.shift} onChange={e => set('shift', e.target.value)} placeholder="Select shift" error={errors.shift} />
          </FormSection>
          <FormSection title="Duration">
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="Start Date" required type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} error={errors.start_date} />
              <FormInput label="End Date" type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} hint="Leave blank for open-ended" />
            </div>
          </FormSection>
          <FormTextarea label="Assignment Notes" value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Any special instructions..." />
        </div>
      </Modal>
    </div>
  );
}
