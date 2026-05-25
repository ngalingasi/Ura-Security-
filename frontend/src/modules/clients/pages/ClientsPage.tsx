import { useState, useEffect, useCallback, useRef } from 'react';
import DataTable, { type Column } from '../../../components/tables/DataTable';
import PageHeader from '../../../components/ui/PageHeader';
import StatusBadge from '../../../components/ui/StatusBadge';
import Modal from '../../../components/ui/Modal';
import WizardStepper from '../../../components/forms/WizardStepper';
import { FormInput, FormTextarea, FormSelect, FormSection } from '../../../components/forms/FormField';
import DatePicker from '../../../components/forms/DatePicker';
import { clientsApi, type Client, type ClientMeta } from '../api/clients.api';
import { formatDate, toDateInput } from '../../../utils/date';
import { getErrorMessage } from '../../../api/client';

const WIZARD_STEPS = [
  { label: 'Company Info'  },
  { label: 'Contact'       },
  { label: 'Contract'      },
  { label: 'Emergency'     },
];

const EMPTY_FORM = {
  name:'', contact_person:'', email:'', phone:'', address:'', region:'',
  contract_number:'', service_type:'', guards_required:'1',
  contract_start:'', contract_end:'',
  emergency_name:'', emergency_phone:'', emergency_relation:'',
  status:'active', notes:'',
};

// ── Per-step error toast ──────────────────────────────────────────────────────
function ErrorBanner({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
      <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 4a8 8 0 100 16A8 8 0 0012 4z"/>
      </svg>
      {msg}
    </div>
  );
}

export default function ClientsPage() {
  const [clients,   setClients]   = useState<Client[]>([]);
  const [meta,      setMeta]      = useState<ClientMeta>({ regions: [], service_types: [] });
  const [loading,   setLoading]   = useState(true);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [search,    setSearch]    = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined as any);

  const [modalOpen, setModalOpen] = useState(false);
  const [editItem,  setEditItem]  = useState<Client | null>(null);
  const [step,      setStep]      = useState(0);
  const [form,      setForm]      = useState({ ...EMPTY_FORM });
  const [errors,    setErrors]    = useState<Record<string,string>>({});
  const [apiError,  setApiError]  = useState('');
  const [saving,    setSaving]    = useState(false);

  // ── Load meta once ──────────────────────────────────────────────────────────
  useEffect(() => {
    clientsApi.getMeta().then(r => setMeta(r.data)).catch(() => {});
  }, []);

  // ── Load clients ─────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await clientsApi.list({
        page, limit: 12, search: search || undefined, status: statusFilter || undefined,
      });
      setClients(data.results);
      setTotal(data.totalResults);
    } catch { setClients([]); }
    finally  { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  // Debounced search
  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {}, 0); // load is triggered by dep change
  };

  // ── Modal helpers ───────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditItem(null); setForm({ ...EMPTY_FORM });
    setStep(0); setErrors({}); setApiError(''); setModalOpen(true);
  };
  const openEdit = (c: Client) => {
    setEditItem(c);
    setForm({
      name: c.name, contact_person: c.contact_person, email: c.email ?? '',
      phone: c.phone, address: c.address ?? '', region: c.region,
      contract_number: c.contract_number ?? '', service_type: c.service_type,
      guards_required: String(c.guards_required),
      contract_start: toDateInput(c.contract_start), contract_end: toDateInput(c.contract_end),
      emergency_name: c.emergency_name ?? '', emergency_phone: c.emergency_phone ?? '',
      emergency_relation: c.emergency_relation ?? '',
      status: c.status, notes: c.notes ?? '',
    });
    setStep(0); setErrors({}); setApiError(''); setModalOpen(true);
  };

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // ── Per-step validation ─────────────────────────────────────────────────────
  const validate = (s: number) => {
    const e: Record<string,string> = {};
    if (s === 0) {
      if (!form.name.trim())   e.name   = 'Client name is required';
      if (!form.region)        e.region = 'Region is required';
    }
    if (s === 1) {
      if (!form.contact_person.trim()) e.contact_person = 'Contact person is required';
      if (!form.phone.trim())          e.phone          = 'Phone is required';
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    }
    if (s === 2) {
      if (!form.service_type)  e.service_type  = 'Service type is required';
      if (!form.contract_start) e.contract_start = 'Start date is required';
      if (!form.guards_required || isNaN(Number(form.guards_required))) e.guards_required = 'Enter valid number';
    }
    setErrors(e);
    return !Object.keys(e).length;
  };

  const nextStep = () => { if (validate(step)) setStep(s => s + 1); };
  const prevStep = () => { setStep(s => s - 1); setErrors({}); };

  const save = async () => {
    if (!validate(step)) return;
    setSaving(true); setApiError('');
    try {
      const payload: Record<string, any> = {
        ...form,
        guards_required: Number(form.guards_required),
        email:          form.email          || null,
        address:        form.address        || null,
        contract_number: form.contract_number || null,
        contract_end:   form.contract_end   || null,
        emergency_name: form.emergency_name || null,
        emergency_phone: form.emergency_phone || null,
        emergency_relation: form.emergency_relation || null,
        notes:          form.notes          || null,
      };
      if (editItem) {
        await clientsApi.update(editItem.client_id, payload);
      } else {
        await clientsApi.create(payload);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setApiError(getErrorMessage(err, 'Failed to save client'));
    } finally {
      setSaving(false);
    }
  };

  const regionOpts    = meta.regions.map(r => ({ value: r.name, label: r.name }));
  const serviceOpts   = meta.service_types.map(s => ({ value: s.name, label: s.name }));
  const statusOpts    = [
    { value:'active', label:'Active'   },
    { value:'inactive', label:'Inactive' },
    { value:'pending',  label:'Pending'  },
    { value:'expired',  label:'Expired'  },
  ];

  // ── Table columns ───────────────────────────────────────────────────────────
  const columns: Column<Client>[] = [
    {
      key: 'name', header: 'Client',
      render: r => (
        <div>
          <p className="font-medium text-gray-800 dark:text-white">{r.name}</p>
          <p className="text-xs text-gray-400">{r.contact_person}</p>
        </div>
      ),
    },
    { key: 'email',        header: 'Email',   className: 'hidden md:table-cell' },
    { key: 'region',       header: 'Region',  className: 'hidden lg:table-cell' },
    { key: 'service_type', header: 'Service', className: 'hidden lg:table-cell' },
    { key: 'guards_required', header: 'Guards', render: r => <span className="font-medium">{r.guards_required}</span> },
    { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status} /> },
    {
      key: '_actions', header: '',
      render: r => (
        <div className="flex items-center gap-3 justify-end">
          <button onClick={() => openEdit(r)} className="text-xs text-brand-500 hover:text-brand-600 font-medium">Edit</button>
          <button
            onClick={async () => { if (confirm(`Deactivate "${r.name}"?`)) { await clientsApi.deactivate(r.client_id); load(); } }}
            className="text-xs text-red-400 hover:text-red-600 font-medium"
          >Delete</button>
        </div>
      ),
    },
  ];

  // ── Wizard step content ─────────────────────────────────────────────────────
  const stepContent = [
    // Step 0
    <div className="space-y-4" key="s0">
      <FormSection title="Company Details">
        <FormInput label="Company / Client Name" required value={form.name}
          onChange={e => set('name', e.target.value)} placeholder="e.g. Azania Bank Ltd" error={errors.name} />
        <div className="grid grid-cols-2 gap-3">
          <FormSelect label="Region" required options={regionOpts.length ? regionOpts : [{ value:'', label:'Loading…' }]}
            value={form.region} onChange={e => set('region', e.target.value)} placeholder="Select region" error={errors.region} />
          <FormSelect label="Status" options={statusOpts}
            value={form.status} onChange={e => set('status', e.target.value)} />
        </div>
      </FormSection>
    </div>,
    // Step 1
    <div className="space-y-4" key="s1">
      <FormSection title="Contact Information">
        <FormInput label="Contact Person" required value={form.contact_person}
          onChange={e => set('contact_person', e.target.value)} placeholder="Full name" error={errors.contact_person} />
        <div className="grid grid-cols-2 gap-3">
          <FormInput label="Phone Number" required value={form.phone}
            onChange={e => set('phone', e.target.value)} placeholder="+255..." error={errors.phone} />
          <FormInput label="Email Address" type="email" value={form.email}
            onChange={e => set('email', e.target.value)} placeholder="contact@company.com" error={errors.email} />
        </div>
        <FormTextarea label="Address" value={form.address}
          onChange={e => set('address', e.target.value)} placeholder="Physical address" rows={2} />
      </FormSection>
    </div>,
    // Step 2
    <div className="space-y-4" key="s2">
      <FormSection title="Contract Details">
        <div className="grid grid-cols-2 gap-3">
          <FormInput label="Contract Number" value={form.contract_number}
            onChange={e => set('contract_number', e.target.value)} placeholder="CTR-2024-001" />
          <FormSelect label="Security Service Type" required options={serviceOpts.length ? serviceOpts : [{ value:'', label:'Loading…' }]}
            value={form.service_type} onChange={e => set('service_type', e.target.value)} placeholder="Select type" error={errors.service_type} />
        </div>
        <FormInput label="Number of Guards" required type="number" min="1" value={form.guards_required}
          onChange={e => set('guards_required', e.target.value)} placeholder="e.g. 5" error={errors.guards_required} />
        <div className="grid grid-cols-2 gap-3">
          <DatePicker label="Start Date" required value={form.contract_start}
            onChange={v => set('contract_start', v)} error={errors.contract_start} />
          <DatePicker label="End Date" value={form.contract_end}
            onChange={v => set('contract_end', v)} />
        </div>
      </FormSection>
    </div>,
    // Step 3
    <div className="space-y-4" key="s3">
      <FormSection title="Emergency Contacts">
        <div className="grid grid-cols-2 gap-3">
          <FormInput label="Emergency Contact Name" value={form.emergency_name}
            onChange={e => set('emergency_name', e.target.value)} placeholder="Full name" />
          <FormInput label="Relationship" value={form.emergency_relation}
            onChange={e => set('emergency_relation', e.target.value)} placeholder="e.g. CEO" />
        </div>
        <FormInput label="Emergency Phone" value={form.emergency_phone}
          onChange={e => set('emergency_phone', e.target.value)} placeholder="+255..." />
      </FormSection>
      <FormSection title="Notes">
        <FormTextarea label="Additional Notes" value={form.notes}
          onChange={e => set('notes', e.target.value)} placeholder="Any additional information…" rows={3} />
      </FormSection>
    </div>,
  ];

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        title="Client List"
        description={`${total} clients`}
        action={
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            </svg>
            New Client
          </button>
        }
      />

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <input type="text" value={search} onChange={e => handleSearch(e.target.value)}
          placeholder="Search clients…"
          className="flex-1 min-w-[180px] h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-4 text-sm focus:border-brand-400 focus:outline-none dark:text-white" />
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 text-sm focus:outline-none dark:text-white">
          <option value="">All Status</option>
          {statusOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <DataTable columns={columns} data={clients} loading={loading} keyField="client_id" emptyText="No clients found" />

      {/* Pagination */}
      {total > 12 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing {Math.min((page - 1) * 12 + 1, total)}–{Math.min(page * 12, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800">
              ← Prev
            </button>
            <button disabled={page * 12 >= total} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800">
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editItem ? `Edit — ${editItem.name}` : 'Add New Client'}
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
                className="px-5 py-2 text-sm font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 flex items-center gap-2">
                {saving && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                {saving ? 'Saving…' : editItem ? 'Update Client' : 'Create Client'}
              </button>
            )}
          </>
        }
      >
        <WizardStepper steps={WIZARD_STEPS} currentStep={step} />
        <ErrorBanner msg={apiError} />
        {stepContent[step]}
      </Modal>
    </div>
  );
}
