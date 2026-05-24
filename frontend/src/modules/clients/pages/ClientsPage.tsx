import { useState } from 'react';
import DataTable, { type Column } from '../../../components/tables/DataTable';
import PageHeader from '../../../components/ui/PageHeader';
import StatusBadge from '../../../components/ui/StatusBadge';
import Modal from '../../../components/ui/Modal';
import WizardStepper from '../../../components/forms/WizardStepper';
import { FormInput, FormTextarea, FormSelect, FormSection, FormActions } from '../../../components/forms/FormField';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Client {
  id:            number;
  name:          string;
  contact:       string;
  email:         string;
  phone:         string;
  region:        string;
  service_type:  string;
  guards:        number;
  status:        string;
  start_date:    string;
}

// ── Wizard steps ──────────────────────────────────────────────────────────────
const WIZARD_STEPS = [
  { label: 'Company Info',  subtitle: 'Basic details'   },
  { label: 'Contact',       subtitle: 'Person & address' },
  { label: 'Contract',      subtitle: 'Service details'  },
  { label: 'Emergency',     subtitle: 'Contacts & notes' },
];

const EMPTY_FORM = {
  name: '', contact: '', email: '', phone: '', address: '', region: '',
  contract_no: '', service_type: '', guards: '', start_date: '', end_date: '',
  emergency_name: '', emergency_phone: '', emergency_relation: '',
  status: 'active', notes: '',
};

const REGIONS = ['Dar es Salaam','Mwanza','Arusha','Mbeya','Dodoma','Tanga','Morogoro','Zanzibar','Kilimanjaro','Lindi','Ruvuma','Songwe'].map(r => ({ value: r, label: r }));
const SERVICE_TYPES = ['Guarding','Patrol','Alarm Response','VIP Protection','Event Security','Investigation'].map(s => ({ value: s, label: s }));

// ── Sample data ───────────────────────────────────────────────────────────────
const SAMPLE_CLIENTS: Client[] = [
  { id: 1, name: 'Azania Bank Ltd',      contact: 'James Mwale',   email: 'jmwale@azania.co.tz',    phone: '+255712345001', region: 'Dar es Salaam', service_type: 'Guarding',         guards: 12, status: 'active',   start_date: '2024-01-01' },
  { id: 2, name: 'CRDB Bank PLC',        contact: 'Sarah Kimaro',  email: 'skimaro@crdb.co.tz',     phone: '+255712345002', region: 'Arusha',        service_type: 'Alarm Response',   guards: 5,  status: 'active',   start_date: '2024-03-15' },
  { id: 3, name: 'TanzaniaPost',         contact: 'Ali Hassan',    email: 'ahassan@tzpost.go.tz',   phone: '+255712345003', region: 'Dodoma',        service_type: 'Patrol',           guards: 8,  status: 'pending',  start_date: '2024-06-01' },
  { id: 4, name: 'Karibu Hotel Group',   contact: 'Mary Shuma',    email: 'mshuma@karibu.co.tz',    phone: '+255712345004', region: 'Mwanza',        service_type: 'Event Security',   guards: 20, status: 'active',   start_date: '2023-08-10' },
  { id: 5, name: 'TANESCO',             contact: 'Peter Ngowi',   email: 'pngowi@tanesco.co.tz',   phone: '+255712345005', region: 'Dar es Salaam', service_type: 'Guarding',         guards: 30, status: 'inactive', start_date: '2022-01-01' },
];

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ClientsPage() {
  const [clients,    setClients]    = useState<Client[]>(SAMPLE_CLIENTS);
  const [search,     setSearch]     = useState('');
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editItem,   setEditItem]   = useState<Client | null>(null);
  const [step,       setStep]       = useState(0);
  const [form,       setForm]       = useState({ ...EMPTY_FORM });
  const [saving,     setSaving]     = useState(false);
  const [errors,     setErrors]     = useState<Record<string, string>>({});

  const filtered = clients.filter((c) =>
    [c.name, c.contact, c.email, c.region, c.service_type].some((v) =>
      v.toLowerCase().includes(search.toLowerCase())
    )
  );

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const openCreate = () => { setEditItem(null); setForm({ ...EMPTY_FORM }); setStep(0); setErrors({}); setModalOpen(true); };
  const openEdit   = (c: Client) => {
    setEditItem(c);
    setForm({ name: c.name, contact: c.contact, email: c.email, phone: c.phone, address: '', region: c.region,
              contract_no: '', service_type: c.service_type, guards: String(c.guards),
              start_date: c.start_date, end_date: '', emergency_name: '', emergency_phone: '',
              emergency_relation: '', status: c.status, notes: '' });
    setStep(0); setErrors({}); setModalOpen(true);
  };

  const validate = (s: number) => {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (!form.name.trim())   e.name   = 'Client name is required';
      if (!form.region)        e.region = 'Region is required';
    }
    if (s === 1) {
      if (!form.contact.trim()) e.contact = 'Contact person is required';
      if (!form.phone.trim())   e.phone   = 'Phone is required';
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    }
    if (s === 2) {
      if (!form.service_type) e.service_type = 'Service type is required';
      if (!form.start_date)   e.start_date   = 'Start date is required';
      if (!form.guards || isNaN(Number(form.guards))) e.guards = 'Enter valid number of guards';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const nextStep = () => { if (validate(step)) setStep((s) => s + 1); };
  const prevStep = () => setStep((s) => s - 1);

  const save = async () => {
    if (!validate(step)) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600)); // simulate API
    if (editItem) {
      setClients((prev) => prev.map((c) => c.id === editItem.id
        ? { ...c, name: form.name, contact: form.contact, email: form.email, phone: form.phone,
            region: form.region, service_type: form.service_type, guards: Number(form.guards),
            start_date: form.start_date, status: form.status }
        : c
      ));
    } else {
      setClients((prev) => [...prev, {
        id: Date.now(), name: form.name, contact: form.contact, email: form.email,
        phone: form.phone, region: form.region, service_type: form.service_type,
        guards: Number(form.guards), start_date: form.start_date, status: form.status,
      }]);
    }
    setSaving(false);
    setModalOpen(false);
  };

  const columns: Column<Client>[] = [
    {
      key: 'name', header: 'Client',
      render: (r) => (
        <div>
          <p className="font-medium text-gray-800 dark:text-white">{r.name}</p>
          <p className="text-xs text-gray-400">{r.contact}</p>
        </div>
      ),
    },
    { key: 'email', header: 'Email', className: 'hidden md:table-cell' },
    { key: 'region', header: 'Region', className: 'hidden lg:table-cell' },
    { key: 'service_type', header: 'Service', className: 'hidden lg:table-cell' },
    { key: 'guards', header: 'Guards', render: (r) => <span className="font-medium">{r.guards}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: '_actions', header: '',
      render: (r) => (
        <div className="flex items-center gap-2 justify-end">
          <button onClick={() => openEdit(r)} className="text-xs text-brand-500 hover:text-brand-600 font-medium">Edit</button>
          <button className="text-xs text-red-400 hover:text-red-600 font-medium">Delete</button>
        </div>
      ),
    },
  ];

  // ── Wizard step content ─────────────────────────────────────────────────────
  const stepContent: Record<number, React.ReactNode> = {
    0: (
      <div className="space-y-4">
        <FormSection title="Company Details">
          <FormInput  label="Company / Client Name" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Azania Bank Ltd" error={errors.name} />
          <div className="grid grid-cols-2 gap-3">
            <FormSelect label="Region" required options={REGIONS} value={form.region} onChange={e => set('region', e.target.value)} placeholder="Select region" error={errors.region} />
            <FormSelect label="Status" options={[{value:'active',label:'Active'},{value:'inactive',label:'Inactive'},{value:'pending',label:'Pending'}]} value={form.status} onChange={e => set('status', e.target.value)} />
          </div>
        </FormSection>
      </div>
    ),
    1: (
      <div className="space-y-4">
        <FormSection title="Contact Information">
          <FormInput label="Contact Person" required value={form.contact} onChange={e => set('contact', e.target.value)} placeholder="Full name" error={errors.contact} />
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Phone Number" required value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+255..." error={errors.phone} />
            <FormInput label="Email Address" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="contact@company.com" error={errors.email} />
          </div>
          <FormTextarea label="Address" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Physical address" rows={2} />
        </FormSection>
      </div>
    ),
    2: (
      <div className="space-y-4">
        <FormSection title="Contract Details">
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Contract Number" value={form.contract_no} onChange={e => set('contract_no', e.target.value)} placeholder="CTR-2024-001" />
            <FormSelect label="Security Service Type" required options={SERVICE_TYPES} value={form.service_type} onChange={e => set('service_type', e.target.value)} placeholder="Select type" error={errors.service_type} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Number of Guards" required type="number" min="1" value={form.guards} onChange={e => set('guards', e.target.value)} placeholder="e.g. 5" error={errors.guards} />
            <div /> {/* spacer */}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Start Date" required type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} error={errors.start_date} />
            <FormInput label="End Date" type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
          </div>
        </FormSection>
      </div>
    ),
    3: (
      <div className="space-y-4">
        <FormSection title="Emergency Contacts">
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Emergency Contact Name" value={form.emergency_name} onChange={e => set('emergency_name', e.target.value)} placeholder="Full name" />
            <FormInput label="Relationship" value={form.emergency_relation} onChange={e => set('emergency_relation', e.target.value)} placeholder="e.g. CEO" />
          </div>
          <FormInput label="Emergency Phone" value={form.emergency_phone} onChange={e => set('emergency_phone', e.target.value)} placeholder="+255..." />
        </FormSection>
        <FormSection title="Notes">
          <FormTextarea label="Additional Notes / Documents" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional information..." rows={3} />
        </FormSection>
      </div>
    ),
  };

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        title="Client List"
        description={`${filtered.length} clients registered`}
        action={
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            New Client
          </button>
        }
      />

      {/* Search */}
      <div className="flex gap-2">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients..."
          className="flex-1 h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-4 text-sm focus:border-brand-400 focus:outline-none dark:text-white" />
      </div>

      <DataTable columns={columns} data={filtered} keyField="id" emptyText="No clients found" />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editItem ? `Edit Client — ${editItem.name}` : 'Add New Client'}
        size="lg"
        footer={
          <>
            {step > 0 && (
              <button type="button" onClick={prevStep}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
                ← Back
              </button>
            )}
            {step < WIZARD_STEPS.length - 1 ? (
              <button type="button" onClick={nextStep}
                className="px-5 py-2 text-sm font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600">
                Next →
              </button>
            ) : (
              <button type="button" onClick={save} disabled={saving}
                className="px-5 py-2 text-sm font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50">
                {saving ? 'Saving...' : editItem ? 'Update Client' : 'Create Client'}
              </button>
            )}
          </>
        }
      >
        <WizardStepper steps={WIZARD_STEPS} currentStep={step} />
        {stepContent[step]}
      </Modal>
    </div>
  );
}
