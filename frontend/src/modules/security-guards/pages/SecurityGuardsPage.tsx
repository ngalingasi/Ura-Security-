import { useState } from 'react';
import DataTable, { type Column } from '../../../components/tables/DataTable';
import PageHeader from '../../../components/ui/PageHeader';
import StatusBadge from '../../../components/ui/StatusBadge';
import Modal from '../../../components/ui/Modal';
import UserAvatar from '../../../components/ui/UserAvatar';
import { FormInput, FormTextarea, FormSelect, FormSection } from '../../../components/forms/FormField';

interface Guard {
  id:          number;
  full_name:   string;
  phone:       string;
  email:       string;
  national_id: string;
  gender:      string;
  dob:         string;
  address:     string;
  next_of_kin: string;
  nok_phone:   string;
  emp_date:    string;
  status:      string;
  site:        string;
}

const EMPTY = { full_name:'', phone:'', email:'', national_id:'', gender:'male', dob:'', address:'', next_of_kin:'', nok_phone:'', emergency_contact:'', emp_date:'', status:'active', site:'', notes:'' };

const SAMPLE: Guard[] = [
  { id:1, full_name:'Hassan Juma Ally',    phone:'+255712000001', email:'hjally@ura.co.tz',   national_id:'19900101-12345-00001-1', gender:'male',   dob:'1990-01-01', address:'Kariakoo, Dar',    next_of_kin:'Fatuma Ally',    nok_phone:'+255712000011', emp_date:'2022-03-01', status:'active',   site:'Main Branch'    },
  { id:2, full_name:'Grace Peter Mwita',   phone:'+255712000002', email:'gpmwita@ura.co.tz',  national_id:'19920515-12345-00002-1', gender:'female', dob:'1992-05-15', address:'Mwanza City',      next_of_kin:'Peter Mwita',    nok_phone:'+255712000012', emp_date:'2023-01-10', status:'active',   site:'Resort Grounds' },
  { id:3, full_name:'Juma Mohammed Said',  phone:'+255712000003', email:'jmsaid@ura.co.tz',   national_id:'19880320-12345-00003-1', gender:'male',   dob:'1988-03-20', address:'Arusha City',      next_of_kin:'Aisha Said',     nok_phone:'+255712000013', emp_date:'2021-06-01', status:'active',   site:'Arusha Office'  },
  { id:4, full_name:'Mary Michael Shuma',  phone:'+255712000004', email:'mmshuma@ura.co.tz',  national_id:'19950710-12345-00004-1', gender:'female', dob:'1995-07-10', address:'Sinza, Dar',       next_of_kin:'Michael Shuma',  nok_phone:'+255712000014', emp_date:'2023-08-15', status:'inactive', site:''               },
  { id:5, full_name:'Ali Rashid Hamad',    phone:'+255712000005', email:'arhamad@ura.co.tz',  national_id:'19930218-12345-00005-1', gender:'male',   dob:'1993-02-18', address:'Temeke, Dar',      next_of_kin:'Zainab Hamad',   nok_phone:'+255712000015', emp_date:'2022-11-01', status:'active',   site:'HQ Building'    },
];

const SITE_OPTS = ['','Main Branch','HQ Building','Arusha Office','Resort Grounds'].map(v => ({ value: v, label: v || 'Unassigned' }));

export default function SecurityGuardsPage() {
  const [guards,    setGuards]   = useState<Guard[]>(SAMPLE);
  const [search,    setSearch]   = useState('');
  const [status,    setStatus]   = useState('');
  const [modal,     setModal]    = useState(false);
  const [viewModal, setViewModal]= useState(false);
  const [editItem,  setEditItem] = useState<Guard | null>(null);
  const [viewItem,  setViewItem] = useState<Guard | null>(null);
  const [form,      setForm]     = useState({ ...EMPTY });
  const [saving,    setSaving]   = useState(false);
  const [errors,    setErrors]   = useState<Record<string,string>>({});

  const filtered = guards.filter(g => {
    const matchSearch = [g.full_name, g.phone, g.email, g.national_id, g.site].some(v => v.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = !status || g.status === status;
    return matchSearch && matchStatus;
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const openCreate = () => { setEditItem(null); setForm({ ...EMPTY }); setErrors({}); setModal(true); };
  const openEdit   = (g: Guard) => { setEditItem(g); setForm({ full_name: g.full_name, phone: g.phone, email: g.email, national_id: g.national_id, gender: g.gender, dob: g.dob, address: g.address, next_of_kin: g.next_of_kin, nok_phone: g.nok_phone, emergency_contact: g.nok_phone, emp_date: g.emp_date, status: g.status, site: g.site, notes: '' }); setErrors({}); setModal(true); };
  const openView   = (g: Guard) => { setViewItem(g); setViewModal(true); };

  const validate = () => {
    const e: Record<string,string> = {};
    if (!form.full_name.trim()) e.full_name = 'Full name is required';
    if (!form.phone.trim())     e.phone     = 'Phone is required';
    if (!form.national_id.trim()) e.national_id = 'National ID is required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    if (editItem) {
      setGuards(prev => prev.map(g => g.id === editItem.id ? { ...g, full_name: form.full_name, phone: form.phone, email: form.email, national_id: form.national_id, gender: form.gender, dob: form.dob, address: form.address, next_of_kin: form.next_of_kin, nok_phone: form.nok_phone, emp_date: form.emp_date, status: form.status, site: form.site } : g));
    } else {
      setGuards(prev => [...prev, { id: Date.now(), ...form, next_of_kin: form.next_of_kin, nok_phone: form.nok_phone }]);
    }
    setSaving(false); setModal(false);
  };

  const columns: Column<Guard>[] = [
    {
      key: 'full_name', header: 'Guard',
      render: r => (
        <div className="flex items-center gap-3">
          <UserAvatar fullName={r.full_name} role="user" size="sm" />
          <div>
            <p className="font-medium text-gray-800 dark:text-white">{r.full_name}</p>
            <p className="text-xs text-gray-400">{r.phone}</p>
          </div>
        </div>
      ),
    },
    { key: 'national_id', header: 'National ID', className: 'hidden lg:table-cell font-mono text-xs' },
    { key: 'site',        header: 'Assigned Site', render: r => <span className="text-xs">{r.site || <span className="text-gray-400">Unassigned</span>}</span> },
    { key: 'emp_date',    header: 'Employed', className: 'hidden md:table-cell text-xs' },
    { key: 'status',      header: 'Status', render: r => <StatusBadge status={r.status} /> },
    {
      key: '_a', header: '',
      render: r => (
        <div className="flex items-center gap-2 justify-end">
          <button onClick={() => openView(r)}  className="text-xs text-gray-500 hover:text-gray-700 font-medium">View</button>
          <button onClick={() => openEdit(r)}  className="text-xs text-brand-500 hover:text-brand-600 font-medium">Edit</button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-5">
      <PageHeader title="Security Guards" description={`${filtered.length} guards`}
        action={<button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>Add Guard</button>}
      />
      <div className="flex gap-2 flex-wrap">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search guards..."
          className="flex-1 min-w-[200px] h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-4 text-sm focus:border-brand-400 focus:outline-none dark:text-white" />
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 text-sm focus:outline-none dark:text-white">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      <DataTable columns={columns} data={filtered} keyField="id" emptyText="No guards found" />

      {/* Create / Edit Modal */}
      <Modal isOpen={modal} onClose={() => setModal(false)} title={editItem ? 'Edit Guard' : 'Add Security Guard'} size="lg"
        footer={<><button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400">Cancel</button><button type="button" onClick={save} disabled={saving} className="px-5 py-2 text-sm font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50">{saving ? 'Saving...' : 'Save Guard'}</button></>}
      >
        <div className="space-y-5">
          <FormSection title="Personal Information">
            <FormInput label="Full Name" required value={form.full_name} onChange={e => set('full_name', e.target.value)} error={errors.full_name} placeholder="Full legal name" />
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="Phone Number" required value={form.phone} onChange={e => set('phone', e.target.value)} error={errors.phone} placeholder="+255..." />
              <FormInput label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="guard@email.com" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="National ID" required value={form.national_id} onChange={e => set('national_id', e.target.value)} error={errors.national_id} placeholder="XXXXXXXXXX-XXXXX-XXXXX-X" />
              <FormSelect label="Gender" options={[{value:'male',label:'Male'},{value:'female',label:'Female'}]} value={form.gender} onChange={e => set('gender', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="Date of Birth" type="date" value={form.dob} onChange={e => set('dob', e.target.value)} />
              <FormInput label="Employment Date" type="date" value={form.emp_date} onChange={e => set('emp_date', e.target.value)} />
            </div>
            <FormTextarea label="Address" value={form.address} onChange={e => set('address', e.target.value)} rows={2} placeholder="Residential address" />
          </FormSection>
          <FormSection title="Next of Kin / Emergency">
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="Next of Kin" value={form.next_of_kin} onChange={e => set('next_of_kin', e.target.value)} placeholder="Full name" />
              <FormInput label="NOK Phone" value={form.nok_phone} onChange={e => set('nok_phone', e.target.value)} placeholder="+255..." />
            </div>
          </FormSection>
          <FormSection title="Assignment & Status">
            <div className="grid grid-cols-2 gap-3">
              <FormSelect label="Assigned Site" options={SITE_OPTS} value={form.site} onChange={e => set('site', e.target.value)} placeholder="Select site" />
              <FormSelect label="Status" options={[{value:'active',label:'Active'},{value:'inactive',label:'Inactive'}]} value={form.status} onChange={e => set('status', e.target.value)} />
            </div>
          </FormSection>
        </div>
      </Modal>

      {/* View Profile Modal */}
      <Modal isOpen={viewModal && !!viewItem} onClose={() => setViewModal(false)} title="Guard Profile" size="md">
        {viewItem && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <UserAvatar fullName={viewItem.full_name} role="user" size="lg" />
              <div>
                <p className="font-bold text-gray-800 dark:text-white">{viewItem.full_name}</p>
                <p className="text-sm text-gray-500">{viewItem.phone}</p>
                <StatusBadge status={viewItem.status} className="mt-1" />
              </div>
            </div>
            {[
              ['National ID', viewItem.national_id],
              ['Email', viewItem.email || '—'],
              ['Gender', viewItem.gender],
              ['Date of Birth', viewItem.dob || '—'],
              ['Address', viewItem.address || '—'],
              ['Assigned Site', viewItem.site || 'Unassigned'],
              ['Employment Date', viewItem.emp_date || '—'],
              ['Next of Kin', viewItem.next_of_kin || '—'],
              ['NOK Phone', viewItem.nok_phone || '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-3 text-sm">
                <span className="w-36 flex-shrink-0 text-gray-400 dark:text-gray-500">{k}</span>
                <span className="text-gray-800 dark:text-white font-medium">{v}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
