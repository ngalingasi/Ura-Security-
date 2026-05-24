import { useState, useEffect, useCallback, useRef, memo } from 'react';
import DataTable, { type Column } from '../../../components/tables/DataTable';
import PageHeader from '../../../components/ui/PageHeader';
import StatusBadge from '../../../components/ui/StatusBadge';
import Modal from '../../../components/ui/Modal';
import UserAvatar from '../../../components/ui/UserAvatar';
import { FormInput, FormTextarea, FormSelect, FormSection } from '../../../components/forms/FormField';
import { guardsApi, resolvePhotoUrl, type SecurityGuard } from '../api/guards.api';
import { getErrorMessage } from '../../../api/client';


/** Ensure a date value is plain YYYY-MM-DD for <input type="date"> */
const toDateInput = (v: string | null | undefined): string => {
  if (!v) return '';
  if (v.includes('T')) return v.slice(0, 10);
  return v;
};

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_OPTS = [
  { value: 'active',    label: 'Active'    },
  { value: 'inactive',  label: 'Inactive'  },
  { value: 'suspended', label: 'Suspended' },
  { value: 'on_leave',  label: 'On Leave'  },
];

const EMPTY_FORM = {
  employee_id: '', full_name: '', phone: '', email: '', national_id: '',
  gender: 'male', date_of_birth: '', address: '',
  next_of_kin_name: '', next_of_kin_phone: '', next_of_kin_relation: '',
  emergency_contact: '', employment_date: '', guard_status: 'active', notes: '',
};

// ── Photo Upload Component (isolated — prevents parent re-render on preview) ──
interface PhotoUploadProps {
  currentUrl:  string | null;
  guardId?:    number;          // undefined = new guard (upload after save)
  onUploaded:  (guard: SecurityGuard) => void;
  onFileSelected: (file: File | null) => void; // for new guards: hold file for later
  pendingFile: File | null;
}

const PhotoUpload = memo(function PhotoUpload({
  currentUrl, guardId, onUploaded, onFileSelected, pendingFile,
}: PhotoUploadProps) {
  const inputRef   = useRef<HTMLInputElement>(null);
  const [preview,  setPreview]  = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error,    setError]    = useState('');

  // Reset preview when modal reopens for a different guard
  useEffect(() => {
    setPreview(null);
    setError('');
  }, [guardId, currentUrl]);

  // Show pending file preview (new guard flow)
  useEffect(() => {
    if (pendingFile) {
      const url = URL.createObjectURL(pendingFile);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreview(null);
  }, [pendingFile]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!inputRef.current) inputRef.current!.value = '';
    e.target.value = '';   // reset input so same file can be reselected
    if (!file) return;

    // Basic client-side validation
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Only JPEG, PNG, or WebP images are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5 MB');
      return;
    }
    setError('');

    if (guardId) {
      // Existing guard — upload immediately
      const objUrl = URL.createObjectURL(file);
      setPreview(objUrl);
      setUploading(true);
      try {
        const { data } = await guardsApi.uploadPhoto(guardId, file);
        onUploaded(data);
      } catch (err) {
        setError(getErrorMessage(err, 'Upload failed'));
        setPreview(null);
      } finally {
        setUploading(false);
        URL.revokeObjectURL(objUrl);
      }
    } else {
      // New guard — hold file, upload after create
      onFileSelected(file);
    }
  };

  const displayUrl = preview ?? resolvePhotoUrl(currentUrl);

  return (
    <div className="flex items-center gap-4">
      {/* Avatar preview */}
      <div className="relative flex-shrink-0">
        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          {displayUrl ? (
            <img src={displayUrl} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
          )}
        </div>
        {uploading && (
          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
            <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-700
            text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
        >
          {uploading ? 'Uploading…' : displayUrl ? 'Change Photo' : 'Upload Photo'}
        </button>
        <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
          JPEG, PNG, WebP · max 5 MB
        </p>
        {!guardId && (
          <p className="mt-0.5 text-xs text-orange-500 dark:text-orange-400">
            Photo will be uploaded after saving
          </p>
        )}
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
});

// ── Guard Form (memo — isolated from parent page state) ───────────────────────
interface GuardFormProps {
  editItem:   SecurityGuard | null;
  onSaved:    (guard: SecurityGuard) => void;
  onClose:    () => void;
}

const GuardForm = memo(function GuardForm({ editItem, onSaved, onClose }: GuardFormProps) {
  const isEdit = !!editItem;

  const [form, setForm] = useState(() =>
    editItem ? {
      employee_id:          editItem.employee_id     ?? '',
      full_name:            editItem.full_name,
      phone:                editItem.phone,
      email:                editItem.email            ?? '',
      national_id:          editItem.national_id,
      gender:               editItem.gender           ?? 'male',
      date_of_birth:        editItem.date_of_birth    ?? '',
      address:              editItem.address          ?? '',
      next_of_kin_name:     editItem.next_of_kin_name ?? '',
      next_of_kin_phone:    editItem.next_of_kin_phone ?? '',
      next_of_kin_relation: editItem.next_of_kin_relation ?? '',
      emergency_contact:    editItem.emergency_contact ?? '',
      employment_date:      editItem.employment_date  ?? '',
      guard_status:         editItem.guard_status,
      notes:                editItem.notes            ?? '',
    } : { ...EMPTY_FORM }
  );

  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [saving,   setSaving]   = useState(false);
  const [errors,   setErrors]   = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');

  // Local guard state (to update after photo upload)
  const [localGuard, setLocalGuard] = useState<SecurityGuard | null>(editItem);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.full_name.trim())   e.full_name   = 'Full name is required';
    if (!form.phone.trim())       e.phone       = 'Phone is required';
    if (!form.national_id.trim()) e.national_id = 'National ID is required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true); setApiError('');
    try {
      const payload: Record<string, any> = {
        ...form,
        employee_id:      form.employee_id      || null,
        email:            form.email            || null,
        date_of_birth:    form.date_of_birth    || null,
        address:          form.address          || null,
        next_of_kin_name: form.next_of_kin_name || null,
        next_of_kin_phone: form.next_of_kin_phone || null,
        next_of_kin_relation: form.next_of_kin_relation || null,
        emergency_contact: form.emergency_contact || null,
        employment_date:  form.employment_date  || null,
        notes:            form.notes            || null,
      };

      let saved: SecurityGuard;
      if (isEdit) {
        const { data } = await guardsApi.update(editItem.guard_id, payload);
        saved = data;
      } else {
        const { data } = await guardsApi.create(payload);
        saved = data;
        // Upload pending photo for new guard now that we have an ID
        if (pendingPhoto) {
          try {
            const { data: withPhoto } = await guardsApi.uploadPhoto(saved.guard_id, pendingPhoto);
            saved = withPhoto;
          } catch { /* photo upload failure is non-fatal */ }
        }
      }
      onSaved(saved);
      onClose();
    } catch (err) {
      setApiError(getErrorMessage(err, 'Failed to save guard'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {apiError && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-sm text-red-600 dark:text-red-400">
          {apiError}
        </div>
      )}

      {/* Profile photo — isolated in its own component, won't cause form re-renders */}
      <FormSection title="Profile Photo">
        <PhotoUpload
          currentUrl={localGuard?.photo_url ?? null}
          guardId={isEdit ? editItem.guard_id : undefined}
          onUploaded={updated => setLocalGuard(updated)}
          onFileSelected={setPendingPhoto}
          pendingFile={pendingPhoto}
        />
      </FormSection>

      <FormSection title="Personal Information">
        <div className="grid grid-cols-2 gap-3">
          <FormInput label="Employee ID" value={form.employee_id}
            onChange={e => set('employee_id', e.target.value)}
            placeholder="e.g. EMP-2024-001" hint="Unique badge / payroll number" />
          <FormInput label="National ID" required value={form.national_id}
            onChange={e => set('national_id', e.target.value)}
            placeholder="XXXXXXXXXX-XXXXX-XXXXX-X" error={errors.national_id} />
        </div>
        <FormInput label="Full Name" required value={form.full_name}
          onChange={e => set('full_name', e.target.value)}
          placeholder="Full legal name" error={errors.full_name} />
        <div className="grid grid-cols-2 gap-3">
          <FormInput label="Phone" required value={form.phone}
            onChange={e => set('phone', e.target.value)}
            placeholder="+255..." error={errors.phone} />
          <FormInput label="Email" type="email" value={form.email}
            onChange={e => set('email', e.target.value)}
            placeholder="guard@email.com" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormSelect label="Gender"
            options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]}
            value={form.gender} onChange={e => set('gender', e.target.value)} />
          <FormInput label="Date of Birth" type="date" value={form.date_of_birth}
            onChange={e => set('date_of_birth', e.target.value)} />
        </div>
        <FormInput label="Employment Date" type="date" value={form.employment_date}
          onChange={e => set('employment_date', e.target.value)} />
        <FormTextarea label="Address" value={form.address}
          onChange={e => set('address', e.target.value)}
          rows={2} placeholder="Residential address" />
      </FormSection>

      <FormSection title="Next of Kin / Emergency">
        <div className="grid grid-cols-2 gap-3">
          <FormInput label="Next of Kin Name" value={form.next_of_kin_name}
            onChange={e => set('next_of_kin_name', e.target.value)} placeholder="Full name" />
          <FormInput label="Relationship" value={form.next_of_kin_relation}
            onChange={e => set('next_of_kin_relation', e.target.value)} placeholder="e.g. Wife" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormInput label="NOK Phone" value={form.next_of_kin_phone}
            onChange={e => set('next_of_kin_phone', e.target.value)} placeholder="+255..." />
          <FormInput label="Emergency Contact" value={form.emergency_contact}
            onChange={e => set('emergency_contact', e.target.value)} placeholder="+255..." />
        </div>
      </FormSection>

      <FormSection title="Employment Status">
        <FormSelect label="Guard Status" options={STATUS_OPTS}
          value={form.guard_status} onChange={e => set('guard_status', e.target.value)} />
        <FormTextarea label="Notes" value={form.notes}
          onChange={e => set('notes', e.target.value)}
          rows={2} placeholder="Any additional notes…" />
      </FormSection>

      {/* Footer actions */}
      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
        <button type="button" onClick={onClose}
          className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg
            text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="px-5 py-2 text-sm font-medium bg-brand-500 text-white rounded-lg
            hover:bg-brand-600 disabled:opacity-50 flex items-center gap-2">
          {saving && (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          )}
          {saving ? 'Saving…' : isEdit ? 'Update Guard' : 'Create Guard'}
        </button>
      </div>
    </form>
  );
});

// ── Guard Profile View (read-only) ────────────────────────────────────────────
const GuardProfile = memo(function GuardProfile({
  guard, onClose,
}: { guard: SecurityGuard; onClose: () => void }) {
  const photoUrl = resolvePhotoUrl(guard.photo_url);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
        <UserAvatar fullName={guard.full_name} role="guard" photoUrl={photoUrl} size="xl" />
        <div className="min-w-0">
          <p className="text-base font-bold text-gray-800 dark:text-white">{guard.full_name}</p>
          {guard.employee_id && (
            <p className="text-xs text-brand-500 dark:text-brand-400 font-medium mt-0.5">
              {guard.employee_id}
            </p>
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400">{guard.phone}</p>
          <StatusBadge status={guard.guard_status} className="mt-1.5" />
        </div>
      </div>

      {/* Details grid */}
      <div className="space-y-1">
        {([
          ['Employee ID',      guard.employee_id || '—'],
          ['National ID',      guard.national_id],
          ['Email',            guard.email || '—'],
          ['Gender',           guard.gender],
          ['Date of Birth',    guard.date_of_birth || '—'],
          ['Address',          guard.address || '—'],
          ['Employment Date',  guard.employment_date || '—'],
          ['Next of Kin',      guard.next_of_kin_name
            ? `${guard.next_of_kin_name}${guard.next_of_kin_relation ? ` (${guard.next_of_kin_relation})` : ''}`
            : '—'],
          ['NOK Phone',        guard.next_of_kin_phone || '—'],
          ['Emergency',        guard.emergency_contact || '—'],
          ['Current Site',     guard.current_assignment?.site_name || 'Unassigned'],
        ] as [string, string][]).map(([k, v]) => (
          <div key={k} className="flex gap-3 text-sm py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
            <span className="w-36 flex-shrink-0 text-gray-400 dark:text-gray-500 text-xs font-medium uppercase tracking-wide pt-0.5">
              {k}
            </span>
            <span className="text-gray-800 dark:text-white break-all">{v}</span>
          </div>
        ))}
      </div>

      {/* Assignment history */}
      {guard.assignments && guard.assignments.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Assignment History
          </p>
          <div className="space-y-1.5">
            {guard.assignments.slice(0, 5).map((a: any) => (
              <div key={a.assignment_id}
                className="flex items-center justify-between text-sm p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{a.site_name}</span>
                  <span className="text-gray-400 mx-1.5">·</span>
                  <span className="text-gray-500 dark:text-gray-400 text-xs">{a.client_name}</span>
                </div>
                <StatusBadge status={a.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button onClick={onClose}
          className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400">
          Close
        </button>
      </div>
    </div>
  );
});

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SecurityGuardsPage() {
  const [guards,    setGuards]    = useState<SecurityGuard[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [search,    setSearch]    = useState('');
  const [statusF,   setStatusF]   = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined as any);

  const [modal,     setModal]     = useState<'form' | 'view' | null>(null);
  const [editItem,  setEditItem]  = useState<SecurityGuard | null>(null);
  const [viewItem,  setViewItem]  = useState<SecurityGuard | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await guardsApi.list({
        page, limit: 12,
        search:       search || undefined,
        guard_status: statusF || undefined,
      });
      setGuards(data.results);
      setTotal(data.totalResults);
    } catch { setGuards([]); }
    finally { setLoading(false); }
  }, [page, search, statusF]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (val: string) => {
    setSearch(val); setPage(1);
    clearTimeout(searchTimer.current);
  };

  const openCreate = () => { setEditItem(null); setModal('form'); };
  const openEdit   = (g: SecurityGuard) => { setEditItem(g); setModal('form'); };

  const openView = async (g: SecurityGuard) => {
    setViewItem(g);
    setModal('view');
    // Fetch full profile in background
    guardsApi.getById(g.guard_id)
      .then(r => setViewItem(r.data))
      .catch(() => {});
  };

  const handleSaved = (saved: SecurityGuard) => {
    // Optimistic update in the list
    setGuards(prev => {
      const idx = prev.findIndex(g => g.guard_id === saved.guard_id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    setTotal(t => editItem ? t : t + 1);
  };

  const columns: Column<SecurityGuard>[] = [
    {
      key: 'full_name',
      header: 'Guard',
      render: r => (
        <div className="flex items-center gap-3">
          <UserAvatar
            fullName={r.full_name}
            role="guard"
            photoUrl={resolvePhotoUrl(r.photo_url)}
            size="sm"
          />
          <div className="min-w-0">
            <p className="font-medium text-gray-800 dark:text-white truncate">{r.full_name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {r.employee_id && (
                <span className="text-[10px] font-medium text-brand-500 dark:text-brand-400">
                  {r.employee_id}
                </span>
              )}
              <span className="text-xs text-gray-400">{r.phone}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'national_id',
      header: 'National ID',
      className: 'hidden lg:table-cell font-mono text-xs text-gray-500 dark:text-gray-400',
    },
    {
      key: 'current_assignment',
      header: 'Assigned Site',
      render: r => r.current_assignment
        ? <span className="text-sm">{r.current_assignment.site_name}</span>
        : <span className="text-xs text-gray-400 italic">Unassigned</span>,
    },
    {
      key: 'employment_date',
      header: 'Employed',
      className: 'hidden md:table-cell text-xs text-gray-500 dark:text-gray-400',
    },
    {
      key: 'guard_status',
      header: 'Status',
      render: r => <StatusBadge status={r.guard_status} />,
    },
    {
      key: '_actions',
      header: '',
      render: r => (
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={() => openView(r)}
            className="px-2.5 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md font-medium"
          >
            View
          </button>
          <button
            onClick={() => openEdit(r)}
            className="px-2.5 py-1 text-xs text-brand-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-md font-medium"
          >
            Edit
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <PageHeader
        title="Security Guards"
        description={`${total} guards`}
        action={
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            </svg>
            Add Guard
          </button>
        }
      />

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search by name, phone, national ID, employee ID…"
          className="flex-1 min-w-[220px] h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-4 text-sm focus:border-brand-400 focus:outline-none dark:text-white"
        />
        <select
          value={statusF}
          onChange={e => { setStatusF(e.target.value); setPage(1); }}
          className="h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 text-sm focus:outline-none dark:text-white"
        >
          <option value="">All Status</option>
          {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={guards}
        loading={loading}
        keyField="guard_id"
        emptyText="No security guards found"
      />

      {/* Pagination */}
      {total > 12 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {Math.min((page - 1) * 12 + 1, total)}–{Math.min(page * 12, total)} of {total}
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

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modal === 'form'}
        onClose={() => setModal(null)}
        title={editItem ? `Edit Guard — ${editItem.full_name}` : 'Add Security Guard'}
        size="lg"
      >
        {modal === 'form' && (
          <GuardForm
            key={editItem?.guard_id ?? 'new'}
            editItem={editItem}
            onSaved={handleSaved}
            onClose={() => setModal(null)}
          />
        )}
      </Modal>

      {/* View Profile Modal */}
      <Modal
        isOpen={modal === 'view' && !!viewItem}
        onClose={() => setModal(null)}
        title="Guard Profile"
        size="md"
      >
        {viewItem && (
          <GuardProfile
            key={viewItem.guard_id}
            guard={viewItem}
            onClose={() => setModal(null)}
          />
        )}
      </Modal>
    </div>
  );
}
