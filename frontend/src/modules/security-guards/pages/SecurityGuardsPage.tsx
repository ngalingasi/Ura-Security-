import { useState, useEffect, useCallback, useRef, memo } from 'react';
import DataTable, { type Column } from '../../../components/tables/DataTable';
import PageHeader from '../../../components/ui/PageHeader';
import StatusBadge from '../../../components/ui/StatusBadge';
import Modal from '../../../components/ui/Modal';
import UserAvatar from '../../../components/ui/UserAvatar';
import DatePicker from '../../../components/forms/DatePicker';
import NationalIdInput from '../../../components/forms/NationalIdInput';
import EducationForm from '../../../components/forms/EducationForm';
import SkillsForm, { SkillLevelBadge } from '../../../components/forms/SkillsForm';
import { FormInput, FormTextarea, FormSelect, FormSection } from '../../../components/forms/FormField';
import { guardsApi, resolvePhotoUrl, resolveFileUrl, isImage, type SecurityGuard, type GuardEducation, type GuardSkill } from '../api/guards.api';
import { getErrorMessage } from '../../../api/client';
import { formatDate, toDateInput } from '../../../utils/date';

const toDateOnly = (v: string | null | undefined) => {
  if (!v) return null;
  if (v.includes('T')) return v.slice(0, 10);
  return v;
};

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

// ── Photo Upload ──────────────────────────────────────────────────────────────
const PhotoUpload = memo(function PhotoUpload({ currentUrl, guardId, onUploaded, onFileSelected, pendingFile }: {
  currentUrl: string|null; guardId?: number; onUploaded: (g: SecurityGuard) => void;
  onFileSelected: (f: File|null) => void; pendingFile: File|null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview]   = useState<string|null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => { setPreview(null); setError(''); }, [guardId, currentUrl]);
  useEffect(() => {
    if (pendingFile) {
      const url = URL.createObjectURL(pendingFile);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreview(null);
  }, [pendingFile]);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/jpeg','image/jpg','image/png','image/webp'].includes(file.type)) { setError('JPEG, PNG or WebP only'); return; }
    if (file.size > 5*1024*1024) { setError('Max 5 MB'); return; }
    setError('');
    if (guardId) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      setUploading(true);
      try { const { data } = await guardsApi.uploadPhoto(guardId, file); onUploaded(data); }
      catch (err) { setError(getErrorMessage(err, 'Upload failed')); setPreview(null); }
      finally { setUploading(false); URL.revokeObjectURL(url); }
    } else { onFileSelected(file); }
  };

  const displayUrl = preview ?? resolvePhotoUrl(currentUrl);
  return (
    <div className="flex items-center gap-4">
      <div className="relative flex-shrink-0">
        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          {displayUrl ? <img src={displayUrl} alt="Profile" className="w-full h-full object-cover"/>
            : <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>}
        </div>
        {uploading && <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center"><svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg></div>}
      </div>
      <div className="flex-1">
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
          {uploading ? 'Uploading…' : displayUrl ? 'Change Photo' : 'Upload Photo'}
        </button>
        <p className="mt-1 text-xs text-gray-400">JPEG, PNG, WebP · max 5 MB</p>
        {!guardId && <p className="text-[10px] text-orange-500 mt-0.5">Uploaded after saving</p>}
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        <input ref={inputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={handleChange}/>
      </div>
    </div>
  );
});

// ── Guard Form ────────────────────────────────────────────────────────────────
const GuardForm = memo(function GuardForm({ editItem, onSaved, onClose }: {
  editItem: SecurityGuard|null; onSaved: (g: SecurityGuard) => void; onClose: () => void;
}) {
  const isEdit = !!editItem;
  const [activeTab, setActiveTab] = useState<'personal'|'education'|'skills'>('personal');
  const [form, setForm] = useState(() => editItem ? {
    employee_id: editItem.employee_id ?? '', full_name: editItem.full_name,
    phone: editItem.phone, email: editItem.email ?? '', national_id: editItem.national_id,
    gender: editItem.gender ?? 'male', date_of_birth: toDateInput(editItem.date_of_birth),
    address: editItem.address ?? '', next_of_kin_name: editItem.next_of_kin_name ?? '',
    next_of_kin_phone: editItem.next_of_kin_phone ?? '', next_of_kin_relation: editItem.next_of_kin_relation ?? '',
    emergency_contact: editItem.emergency_contact ?? '', employment_date: toDateInput(editItem.employment_date),
    guard_status: editItem.guard_status, notes: editItem.notes ?? '',
  } : { ...EMPTY_FORM });

  const [education, setEducation] = useState<GuardEducation[]>(editItem?.education ?? []);
  const [skills,    setSkills]    = useState<GuardSkill[]>(editItem?.skills ?? []);
  const [levels,    setLevels]    = useState<string[]>([]);
  const [pendingPhoto, setPendingPhoto] = useState<File|null>(null);
  const [localGuard, setLocalGuard] = useState<SecurityGuard|null>(editItem);
  const [saving,    setSaving]    = useState(false);
  const [errors,    setErrors]    = useState<Record<string,string>>({});
  const [apiError,  setApiError]  = useState('');

  useEffect(() => {
    guardsApi.getEducationLevels().then(r => setLevels(r.data)).catch(() => {});
  }, []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e: Record<string,string> = {};
    if (!form.full_name.trim())   e.full_name   = 'Full name is required';
    if (!form.phone.trim())       e.phone       = 'Phone is required';
    if (!form.national_id.trim()) e.national_id = 'National ID is required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) { setActiveTab('personal'); return; }
    setSaving(true); setApiError('');
    try {
      const payload: Record<string,any> = {
        ...form,
        employee_id:      form.employee_id      || null,
        email:            form.email            || null,
        date_of_birth:    toDateOnly(form.date_of_birth),
        address:          form.address          || null,
        next_of_kin_name: form.next_of_kin_name || null,
        next_of_kin_phone: form.next_of_kin_phone || null,
        next_of_kin_relation: form.next_of_kin_relation || null,
        emergency_contact: form.emergency_contact || null,
        employment_date:  toDateOnly(form.employment_date),
        notes:            form.notes            || null,
      };

      let saved: SecurityGuard;
      if (isEdit) {
        const { data } = await guardsApi.update(editItem.guard_id, payload);
        saved = data;
      } else {
        const { data } = await guardsApi.create(payload);
        saved = data;
        if (pendingPhoto) {
          try { const { data: wp } = await guardsApi.uploadPhoto(saved.guard_id, pendingPhoto); saved = wp; }
          catch { /* non-fatal */ }
        }
      }

      const guardId = saved.guard_id;

      // Save education (upload pending files first)
      const eduRecords = await Promise.all(education.map(async (r) => {
        const clean: any = { education_id: r.education_id, level: r.level, institution_name: r.institution_name, year_completed: r.year_completed || null, attachment_url: r.attachment_url || null };
        return clean;
      }));
      const validEdu = eduRecords.filter(r => r.level && r.institution_name);
      if (validEdu.length || isEdit) {
        try {
          const { data: savedEdu } = await guardsApi.saveEducation(guardId, validEdu);
          // Now upload pending files for each saved record
          for (let i = 0; i < education.length; i++) {
            if (education[i]._file && savedEdu[i]?.education_id) {
              try {
                await guardsApi.uploadEducationAttachment(savedEdu[i].education_id!, education[i]._file!);
              } catch { /* non-fatal */ }
            }
          }
        } catch { /* non-fatal */ }
      }

      // Save skills
      const skillRecords = skills.map(r => ({
        skill_id: r.skill_id, skill_name: r.skill_name,
        skill_level: r.skill_level || null, attachment_url: r.attachment_url || null,
      }));
      const validSkills = skillRecords.filter(r => r.skill_name);
      if (validSkills.length || isEdit) {
        try {
          const { data: savedSkills } = await guardsApi.saveSkills(guardId, validSkills);
          for (let i = 0; i < skills.length; i++) {
            if (skills[i]._file && savedSkills[i]?.skill_id) {
              try {
                await guardsApi.uploadSkillAttachment(savedSkills[i].skill_id!, skills[i]._file!);
              } catch { /* non-fatal */ }
            }
          }
        } catch { /* non-fatal */ }
      }

      // Fetch final guard with all relations
      const { data: final } = await guardsApi.getById(guardId);
      onSaved(final);
      onClose();
    } catch (err) {
      setApiError(getErrorMessage(err, 'Failed to save guard'));
    } finally { setSaving(false); }
  };

  const tabs = [
    { id: 'personal',  label: 'Personal',  count: 0 },
    { id: 'education', label: 'Education', count: education.length },
    { id: 'skills',    label: 'Skills',    count: skills.length    },
  ] as const;

  return (
    <form onSubmit={handleSave} className="space-y-0">
      {apiError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-sm text-red-600 dark:text-red-400">
          {apiError}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-5 -mx-6 px-6 gap-4">
        {tabs.map(t => (
          <button key={t.id} type="button" onClick={() => setActiveTab(t.id as any)}
            className={`pb-3 text-sm font-medium border-b-2 -mb-px flex items-center gap-1.5 ${
              activeTab === t.id
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}>
            {t.label}
            {t.count > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Personal Tab */}
      {activeTab === 'personal' && (
        <div className="space-y-5">
          <FormSection title="Profile Photo">
            <PhotoUpload currentUrl={localGuard?.photo_url ?? null} guardId={isEdit ? editItem.guard_id : undefined}
              onUploaded={g => setLocalGuard(g)} onFileSelected={setPendingPhoto} pendingFile={pendingPhoto}/>
          </FormSection>

          <FormSection title="Personal Information">
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="Employee ID" value={form.employee_id} onChange={e => set('employee_id', e.target.value)} placeholder="EMP-2024-001" hint="Badge / payroll number"/>
              <NationalIdInput required value={form.national_id} onChange={v => set('national_id', v)} error={errors.national_id}/>
            </div>
            <FormInput label="Full Name" required value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Full legal name" error={errors.full_name}/>
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="Phone" required value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+255..." error={errors.phone}/>
              <FormInput label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="guard@email.com"/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormSelect label="Gender" options={[{value:'male',label:'Male'},{value:'female',label:'Female'}]} value={form.gender} onChange={e => set('gender', e.target.value)}/>
              <DatePicker label="Date of Birth" value={form.date_of_birth} onChange={v => set('date_of_birth', v)}/>
            </div>
            <DatePicker label="Employment Date" value={form.employment_date} onChange={v => set('employment_date', v)}/>
            <FormTextarea label="Address" value={form.address} onChange={e => set('address', e.target.value)} rows={2} placeholder="Residential address"/>
          </FormSection>

          <FormSection title="Next of Kin / Emergency">
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="Next of Kin Name" value={form.next_of_kin_name} onChange={e => set('next_of_kin_name', e.target.value)} placeholder="Full name"/>
              <FormInput label="Relationship" value={form.next_of_kin_relation} onChange={e => set('next_of_kin_relation', e.target.value)} placeholder="e.g. Wife"/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="NOK Phone" value={form.next_of_kin_phone} onChange={e => set('next_of_kin_phone', e.target.value)} placeholder="+255..."/>
              <FormInput label="Emergency Contact" value={form.emergency_contact} onChange={e => set('emergency_contact', e.target.value)} placeholder="+255..."/>
            </div>
          </FormSection>

          <FormSection title="Status">
            <FormSelect label="Guard Status" options={STATUS_OPTS} value={form.guard_status} onChange={e => set('guard_status', e.target.value)}/>
            <FormTextarea label="Notes" value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Any additional notes…"/>
          </FormSection>
        </div>
      )}

      {/* Education Tab */}
      {activeTab === 'education' && (
        <EducationForm records={education} levels={levels} onChange={setEducation}/>
      )}

      {/* Skills Tab */}
      {activeTab === 'skills' && (
        <SkillsForm records={skills} onChange={setSkills}/>
      )}

      {/* Footer */}
      <div className="flex justify-end gap-3 pt-5 mt-5 border-t border-gray-100 dark:border-gray-800">
        <button type="button" onClick={onClose}
          className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="px-5 py-2 text-sm font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 flex items-center gap-2">
          {saving && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
          {saving ? 'Saving…' : isEdit ? 'Update Guard' : 'Create Guard'}
        </button>
      </div>
    </form>
  );
});

// ── Guard Profile View ────────────────────────────────────────────────────────
const GuardProfile = memo(function GuardProfile({ guard, onClose }: { guard: SecurityGuard; onClose: () => void }) {
  const [tab, setTab] = useState<'info'|'education'|'skills'|'assignments'>('info');
  const photoUrl = resolvePhotoUrl(guard.photo_url);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
        <UserAvatar fullName={guard.full_name} role="guard" photoUrl={photoUrl} size="xl"/>
        <div className="min-w-0">
          <p className="font-bold text-gray-800 dark:text-white">{guard.full_name}</p>
          {guard.employee_id && <p className="text-xs text-brand-500 font-medium">{guard.employee_id}</p>}
          <p className="text-sm text-gray-500">{guard.phone}</p>
          <StatusBadge status={guard.guard_status} className="mt-1"/>
        </div>
      </div>

      {/* Profile tabs */}
      <div className="flex gap-3 border-b border-gray-200 dark:border-gray-700">
        {[
          { id:'info',        label:'Info' },
          { id:'education',   label:`Education (${guard.education?.length ?? 0})` },
          { id:'skills',      label:`Skills (${guard.skills?.length ?? 0})` },
          { id:'assignments', label:`Assignments (${guard.assignments?.length ?? 0})` },
        ].map(t => (
          <button key={t.id} type="button" onClick={() => setTab(t.id as any)}
            className={`pb-2 text-xs font-medium border-b-2 -mb-px ${tab===t.id ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-gray-500'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Info tab */}
      {tab === 'info' && (
        <div className="space-y-1">
          {([
            ['Employee ID',     guard.employee_id || '—'],
            ['National ID',     guard.national_id],
            ['Email',           guard.email || '—'],
            ['Gender',          guard.gender],
            ['Date of Birth',   formatDate(guard.date_of_birth)],
            ['Address',         guard.address || '—'],
            ['Employment Date', formatDate(guard.employment_date)],
            ['Next of Kin',     guard.next_of_kin_name ? `${guard.next_of_kin_name}${guard.next_of_kin_relation ? ` (${guard.next_of_kin_relation})` : ''}` : '—'],
            ['NOK Phone',       guard.next_of_kin_phone || '—'],
            ['Emergency',       guard.emergency_contact || '—'],
            ['Current Site',    guard.current_assignment?.site_name || 'Unassigned'],
          ] as [string,string][]).map(([k,v]) => (
            <div key={k} className="flex gap-3 text-sm py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
              <span className="w-36 flex-shrink-0 text-xs font-medium text-gray-400 uppercase tracking-wide pt-0.5">{k}</span>
              <span className="text-gray-800 dark:text-white break-all">{v}</span>
            </div>
          ))}
        </div>
      )}

      {/* Education tab */}
      {tab === 'education' && (
        <div className="space-y-3">
          {!guard.education?.length && <p className="text-sm text-gray-400 italic py-4 text-center">No education records</p>}
          {guard.education?.map(e => (
            <div key={e.education_id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 dark:text-white text-sm">{e.institution_name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{e.level}{e.year_completed ? ` · ${e.year_completed}` : ''}</p>
              </div>
              {e.attachment_url && (
                <a href={resolveFileUrl(e.attachment_url)!} target="_blank" rel="noreferrer"
                  className="flex-shrink-0 text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1">
                  {isImage(e.attachment_url)
                    ? <img src={resolveFileUrl(e.attachment_url)!} className="w-8 h-8 rounded object-cover border border-gray-200 dark:border-gray-700"/>
                    : <><svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5z"/></svg>View</>}
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Skills tab */}
      {tab === 'skills' && (
        <div className="space-y-3">
          {!guard.skills?.length && <p className="text-sm text-gray-400 italic py-4 text-center">No skills or certifications</p>}
          {guard.skills?.map(s => (
            <div key={s.skill_id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 dark:text-white text-sm">{s.skill_name}</p>
                <SkillLevelBadge level={s.skill_level}/>
              </div>
              {s.attachment_url && (
                <a href={resolveFileUrl(s.attachment_url)!} target="_blank" rel="noreferrer"
                  className="flex-shrink-0">
                  {isImage(s.attachment_url)
                    ? <img src={resolveFileUrl(s.attachment_url)!} className="w-8 h-8 rounded object-cover border border-gray-200 dark:border-gray-700"/>
                    : <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5z"/></svg>}
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Assignments tab */}
      {tab === 'assignments' && (
        <div className="space-y-2">
          {!guard.assignments?.length && <p className="text-sm text-gray-400 italic py-4 text-center">No assignment history</p>}
          {guard.assignments?.slice(0,10).map((a: any) => (
            <div key={a.assignment_id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
              <div>
                <p className="font-medium text-sm text-gray-800 dark:text-white">{a.site_name}</p>
                <p className="text-xs text-gray-500">{a.client_name} · {a.shift}</p>
                <p className="text-xs text-gray-400">{formatDate(a.start_date)}{a.end_date ? ` – ${formatDate(a.end_date)}` : ' – Present'}</p>
              </div>
              <StatusBadge status={a.status}/>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400">Close</button>
      </div>
    </div>
  );
});

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SecurityGuardsPage() {
  const [guards,  setGuards]  = useState<SecurityGuard[]>([]);
  const [loading, setLoading] = useState(true);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [search,  setSearch]  = useState('');
  const [statusF, setStatusF] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined as any);

  const [modal,    setModal]    = useState<'form'|'view'|null>(null);
  const [editItem, setEditItem] = useState<SecurityGuard|null>(null);
  const [viewItem, setViewItem] = useState<SecurityGuard|null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await guardsApi.list({ page, limit: 12, search: search||undefined, guard_status: statusF||undefined });
      setGuards(data.results); setTotal(data.totalResults);
    } catch { setGuards([]); }
    finally { setLoading(false); }
  }, [page, search, statusF]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (val: string) => { setSearch(val); setPage(1); clearTimeout(searchTimer.current); };

  const openCreate = () => { setEditItem(null); setModal('form'); };
  const openEdit   = (g: SecurityGuard) => { setEditItem(g); setModal('form'); };
  const openView   = async (g: SecurityGuard) => {
    setViewItem(g); setModal('view');
    guardsApi.getById(g.guard_id).then(r => setViewItem(r.data)).catch(() => {});
  };

  const handleSaved = (saved: SecurityGuard) => {
    setGuards(prev => {
      const idx = prev.findIndex(g => g.guard_id === saved.guard_id);
      if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n; }
      return [saved, ...prev];
    });
    setTotal(t => editItem ? t : t + 1);
  };

  const columns: Column<SecurityGuard>[] = [
    { key: 'full_name', header: 'Guard',
      render: r => (
        <div className="flex items-center gap-3">
          <UserAvatar fullName={r.full_name} role="guard" photoUrl={resolvePhotoUrl(r.photo_url)} size="sm"/>
          <div className="min-w-0">
            <p className="font-medium text-gray-800 dark:text-white truncate">{r.full_name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {r.employee_id && <span className="text-[10px] font-medium text-brand-500">{r.employee_id}</span>}
              <span className="text-xs text-gray-400">{r.phone}</span>
            </div>
          </div>
        </div>
      )
    },
    { key: 'national_id', header: 'National ID', className: 'hidden lg:table-cell font-mono text-xs text-gray-500 dark:text-gray-400' },
    { key: 'current_assignment', header: 'Assigned Site',
      render: r => r.current_assignment
        ? <span className="text-sm">{r.current_assignment.site_name}</span>
        : <span className="text-xs text-gray-400 italic">Unassigned</span>
    },
    { key: 'employment_date', header: 'Employed', className: 'hidden md:table-cell text-xs text-gray-500 dark:text-gray-400',
      render: r => <span>{formatDate(r.employment_date)}</span>
    },
    { key: 'guard_status', header: 'Status', render: r => <StatusBadge status={r.guard_status}/> },
    { key: '_a', header: '',
      render: r => (
        <div className="flex items-center gap-2 justify-end">
          <button onClick={() => openView(r)} className="px-2.5 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md font-medium">View</button>
          <button onClick={() => openEdit(r)} className="px-2.5 py-1 text-xs text-brand-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-md font-medium">Edit</button>
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
        <input type="text" value={search} onChange={e => handleSearch(e.target.value)}
          placeholder="Search name, phone, ID, employee ID…"
          className="flex-1 min-w-[220px] h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-4 text-sm focus:border-brand-400 focus:outline-none dark:text-white"/>
        <select value={statusF} onChange={e => { setStatusF(e.target.value); setPage(1); }}
          className="h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 text-sm focus:outline-none dark:text-white">
          <option value="">All Status</option>
          {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <DataTable columns={columns} data={guards} loading={loading} keyField="guard_id" emptyText="No security guards found"/>

      {total > 12 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {Math.min((page-1)*12+1, total)}–{Math.min(page*12, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800">← Prev</button>
            <button disabled={page*12>=total} onClick={() => setPage(p=>p+1)} className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800">Next →</button>
          </div>
        </div>
      )}

      <Modal isOpen={modal==='form'} onClose={() => setModal(null)}
        title={editItem ? `Edit Guard — ${editItem.full_name}` : 'Add Security Guard'} size="lg">
        {modal==='form' && <GuardForm key={editItem?.guard_id ?? 'new'} editItem={editItem} onSaved={handleSaved} onClose={() => setModal(null)}/>}
      </Modal>

      <Modal isOpen={modal==='view' && !!viewItem} onClose={() => setModal(null)} title="Guard Profile" size="md">
        {viewItem && <GuardProfile key={viewItem.guard_id} guard={viewItem} onClose={() => setModal(null)}/>}
      </Modal>
    </div>
  );
}
