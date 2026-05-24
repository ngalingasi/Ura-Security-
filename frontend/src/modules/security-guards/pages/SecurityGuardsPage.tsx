import { useState, useEffect, useCallback, useRef } from 'react';
import DataTable, { type Column } from '../../../components/tables/DataTable';
import PageHeader from '../../../components/ui/PageHeader';
import StatusBadge from '../../../components/ui/StatusBadge';
import Modal from '../../../components/ui/Modal';
import UserAvatar from '../../../components/ui/UserAvatar';
import { FormInput, FormTextarea, FormSelect, FormSection } from '../../../components/forms/FormField';
import { guardsApi, type SecurityGuard } from '../api/guards.api';
import { getErrorMessage } from '../../../api/client';

const EMPTY = {
  full_name:'', phone:'', email:'', national_id:'', gender:'male', date_of_birth:'',
  address:'', next_of_kin_name:'', next_of_kin_phone:'', next_of_kin_relation:'',
  emergency_contact:'', employment_date:'', guard_status:'active', notes:'',
};

const STATUS_OPTS = [
  { value:'active', label:'Active' },
  { value:'inactive', label:'Inactive' },
  { value:'suspended', label:'Suspended' },
  { value:'on_leave', label:'On Leave' },
];

export default function SecurityGuardsPage() {
  const [guards,  setGuards]  = useState<SecurityGuard[]>([]);
  const [loading, setLoading] = useState(true);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [search,  setSearch]  = useState('');
  const [statusF, setStatusF] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  const [modal,      setModal]     = useState(false);
  const [viewModal,  setViewModal] = useState(false);
  const [editItem,   setEditItem]  = useState<SecurityGuard | null>(null);
  const [viewItem,   setViewItem]  = useState<SecurityGuard | null>(null);
  const [form,       setForm]      = useState({ ...EMPTY });
  const [errors,     setErrors]    = useState<Record<string,string>>({});
  const [apiError,   setApiError]  = useState('');
  const [saving,     setSaving]    = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await guardsApi.list({
        page, limit: 12,
        search: search || undefined,
        guard_status: statusF || undefined,
      });
      setGuards(data.results);
      setTotal(data.totalResults);
    } catch { setGuards([]); }
    finally  { setLoading(false); }
  }, [page, search, statusF]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (val: string) => {
    setSearch(val); setPage(1);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {}, 0);
  };

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const openCreate = () => { setEditItem(null); setForm({ ...EMPTY }); setErrors({}); setApiError(''); setModal(true); };
  const openEdit   = (g: SecurityGuard) => {
    setEditItem(g);
    setForm({
      full_name: g.full_name, phone: g.phone, email: g.email ?? '', national_id: g.national_id,
      gender: g.gender, date_of_birth: g.date_of_birth ?? '', address: g.address ?? '',
      next_of_kin_name: g.next_of_kin_name ?? '', next_of_kin_phone: g.next_of_kin_phone ?? '',
      next_of_kin_relation: g.next_of_kin_relation ?? '', emergency_contact: g.emergency_contact ?? '',
      employment_date: g.employment_date ?? '', guard_status: g.guard_status, notes: g.notes ?? '',
    });
    setErrors({}); setApiError(''); setModal(true);
  };

  const openView = async (g: SecurityGuard) => {
    try {
      const { data } = await guardsApi.getById(g.guard_id);
      setViewItem(data);
    } catch { setViewItem(g); }
    setViewModal(true);
  };

  const validate = () => {
    const e: Record<string,string> = {};
    if (!form.full_name.trim())   e.full_name   = 'Full name is required';
    if (!form.phone.trim())       e.phone       = 'Phone is required';
    if (!form.national_id.trim()) e.national_id = 'National ID is required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true); setApiError('');
    try {
      const payload = {
        ...form,
        email: form.email || null,
        date_of_birth: form.date_of_birth || null,
        address: form.address || null,
        next_of_kin_name: form.next_of_kin_name || null,
        next_of_kin_phone: form.next_of_kin_phone || null,
        next_of_kin_relation: form.next_of_kin_relation || null,
        emergency_contact: form.emergency_contact || null,
        employment_date: form.employment_date || null,
        notes: form.notes || null,
      };
      if (editItem) await guardsApi.update(editItem.guard_id, payload);
      else          await guardsApi.create(payload);
      setModal(false); load();
    } catch (err) {
      setApiError(getErrorMessage(err, 'Failed to save guard'));
    } finally { setSaving(false); }
  };

  const columns: Column<SecurityGuard>[] = [
    { key: 'full_name', header: 'Guard',
      render: r => (
        <div className="flex items-center gap-3">
          <UserAvatar fullName={r.full_name} role="user" size="sm" />
          <div>
            <p className="font-medium text-gray-800 dark:text-white">{r.full_name}</p>
            <p className="text-xs text-gray-400">{r.phone}</p>
          </div>
        </div>
      )
    },
    { key: 'national_id', header: 'National ID', className: 'hidden lg:table-cell font-mono text-xs' },
    { key: 'current_assignment', header: 'Assigned Site',
      render: r => r.current_assignment
        ? <span className="text-xs">{r.current_assignment.site_name}</span>
        : <span className="text-xs text-gray-400">Unassigned</span>
    },
    { key: 'employment_date', header: 'Employed', className: 'hidden md:table-cell text-xs' },
    { key: 'guard_status', header: 'Status', render: r => <StatusBadge status={r.guard_status} /> },
    { key: '_a', header: '',
      render: r => (
        <div className="flex items-center gap-2 justify-end">
          <button onClick={() => openView(r)} className="text-xs text-gray-500 hover:text-gray-700 font-medium">View</button>
          <button onClick={() => openEdit(r)} className="text-xs text-brand-500 hover:text-brand-600 font-medium">Edit</button>
        </div>
      )
    },
  ];

  return (
    <div className="p-6 space-y-5">
      <PageHeader title="Security Guards" description={`${total} guards`}
        action={<button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          Add Guard
        </button>}
      />
      <div className="flex gap-2 flex-wrap">
        <input type="text" value={search} onChange={e => handleSearch(e.target.value)} placeholder="Search guards…"
          className="flex-1 min-w-[200px] h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-4 text-sm focus:border-brand-400 focus:outline-none dark:text-white" />
        <select value={statusF} onChange={e => { setStatusF(e.target.value); setPage(1); }}
          className="h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 text-sm focus:outline-none dark:text-white">
          <option value="">All Status</option>
          {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <DataTable columns={columns} data={guards} loading={loading} keyField="guard_id" emptyText="No guards found" />

      {total > 12 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">{total} total</p>
          <div className="flex gap-2">
            <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-40">← Prev</button>
            <button disabled={page*12>=total} onClick={() => setPage(p=>p+1)} className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-40">Next →</button>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal isOpen={modal} onClose={() => setModal(false)} title={editItem ? 'Edit Guard' : 'Add Security Guard'} size="lg"
        footer={<>
          <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400">Cancel</button>
          <button type="button" onClick={save} disabled={saving} className="px-5 py-2 text-sm font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 flex items-center gap-2">
            {saving && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
            {saving ? 'Saving…' : 'Save Guard'}
          </button>
        </>}
      >
        {apiError && <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-sm text-red-600 dark:text-red-400">{apiError}</div>}
        <div className="space-y-5">
          <FormSection title="Personal Information">
            <FormInput label="Full Name" required value={form.full_name} onChange={e => set('full_name', e.target.value)} error={errors.full_name} placeholder="Full legal name" />
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="Phone" required value={form.phone} onChange={e => set('phone', e.target.value)} error={errors.phone} placeholder="+255..." />
              <FormInput label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="guard@email.com" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="National ID" required value={form.national_id} onChange={e => set('national_id', e.target.value)} error={errors.national_id} placeholder="XXXXXXXXXX-XXXXX-XXXXX-X" />
              <FormSelect label="Gender" options={[{value:'male',label:'Male'},{value:'female',label:'Female'}]} value={form.gender} onChange={e => set('gender', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="Date of Birth" type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
              <FormInput label="Employment Date" type="date" value={form.employment_date} onChange={e => set('employment_date', e.target.value)} />
            </div>
            <FormTextarea label="Address" value={form.address} onChange={e => set('address', e.target.value)} rows={2} placeholder="Residential address" />
          </FormSection>
          <FormSection title="Next of Kin / Emergency">
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="Next of Kin" value={form.next_of_kin_name} onChange={e => set('next_of_kin_name', e.target.value)} placeholder="Full name" />
              <FormInput label="Relationship" value={form.next_of_kin_relation} onChange={e => set('next_of_kin_relation', e.target.value)} placeholder="e.g. Wife" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="NOK Phone" value={form.next_of_kin_phone} onChange={e => set('next_of_kin_phone', e.target.value)} placeholder="+255..." />
              <FormInput label="Emergency Contact" value={form.emergency_contact} onChange={e => set('emergency_contact', e.target.value)} placeholder="+255..." />
            </div>
          </FormSection>
          <FormSection title="Status">
            <FormSelect label="Guard Status" options={STATUS_OPTS} value={form.guard_status} onChange={e => set('guard_status', e.target.value)} />
            <FormTextarea label="Notes" value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Any additional notes..." />
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
                <StatusBadge status={viewItem.guard_status} className="mt-1" />
              </div>
            </div>
            <div className="space-y-2">
              {[
                ['National ID',      viewItem.national_id],
                ['Email',            viewItem.email || '—'],
                ['Gender',           viewItem.gender],
                ['Date of Birth',    viewItem.date_of_birth || '—'],
                ['Address',          viewItem.address || '—'],
                ['Employment Date',  viewItem.employment_date || '—'],
                ['Next of Kin',      viewItem.next_of_kin_name ? `${viewItem.next_of_kin_name} (${viewItem.next_of_kin_relation || 'N/A'})` : '—'],
                ['NOK Phone',        viewItem.next_of_kin_phone || '—'],
                ['Current Site',     viewItem.current_assignment?.site_name || 'Unassigned'],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3 text-sm py-1 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <span className="w-36 flex-shrink-0 text-gray-400 dark:text-gray-500">{k}</span>
                  <span className="text-gray-800 dark:text-white font-medium">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
