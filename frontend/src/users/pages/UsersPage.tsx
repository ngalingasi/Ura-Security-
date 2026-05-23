import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import client from '../../auth/api/authApi';
import type { UserRecord, Skill, PaginatedResponse } from '../../types';
import { useAuth } from '../../store/authStore';

// ─────────────────────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'warning' | 'info';
interface ToastItem { id: number; type: ToastType; title: string; message?: string; }

let _listeners: ((t: ToastItem[]) => void)[] = [];
let _toasts: ToastItem[] = [];
let _counter = 0;

const notify = (type: ToastType, title: string, message?: string) => {
  const id = ++_counter;
  _toasts = [..._toasts, { id, type, title, message }];
  _listeners.forEach(l => l(_toasts));
  setTimeout(() => { _toasts = _toasts.filter(t => t.id !== id); _listeners.forEach(l => l(_toasts)); }, 4000);
};

export const toast = {
  success: (title: string, message?: string) => notify('success', title, message),
  error:   (title: string, message?: string) => notify('error',   title, message),
};

const TOAST_STYLES: Record<ToastType, { border: string; icon: string; iconBg: string }> = {
  success: { border: 'border-green-200 dark:border-green-500/30',  icon: '✓', iconBg: 'bg-green-500' },
  error:   { border: 'border-red-200 dark:border-red-500/30',      icon: '✕', iconBg: 'bg-red-500'   },
  warning: { border: 'border-orange-200 dark:border-orange-500/30', icon: '!', iconBg: 'bg-orange-500' },
  info:    { border: 'border-blue-200 dark:border-blue-500/30',    icon: 'i', iconBg: 'bg-blue-500'  },
};

function ToastItemEl({ t, onRemove }: { t: ToastItem; onRemove: () => void }) {
  const [vis, setVis] = useState(false);
  const s = TOAST_STYLES[t.type];
  useEffect(() => {
    requestAnimationFrame(() => setVis(true));
    const timer = setTimeout(() => { setVis(false); setTimeout(onRemove, 300); }, 3700);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className={`flex items-start gap-3 w-80 p-4 rounded-xl border shadow-lg bg-white dark:bg-gray-900 ${s.border}
      transition-all duration-300 ${vis ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
      <span className={`flex-shrink-0 w-6 h-6 rounded-full ${s.iconBg} text-white text-xs font-bold flex items-center justify-center`}>{s.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 dark:text-white">{t.title}</p>
        {t.message && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.message}</p>}
      </div>
      <button onClick={() => { setVis(false); setTimeout(onRemove, 300); }} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
    </div>
  );
}

function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => { _listeners.push(setItems); return () => { _listeners = _listeners.filter(l => l !== setItems); }; }, []);
  if (!items.length) return null;
  return createPortal(
    <div className="fixed top-4 right-4 z-[99999] flex flex-col gap-3">
      {items.map(t => <ToastItemEl key={t.id} t={t} onRemove={() => { _toasts = _toasts.filter(x => x.id !== t.id); _listeners.forEach(l => l(_toasts)); }} />)}
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal
// ─────────────────────────────────────────────────────────────────────────────
const SIZE_CLS = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

function Modal({ isOpen, onClose, title, children, size = 'md' }: {
  isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'sm'|'md'|'lg'|'xl';
}) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);
  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
      <div className="absolute inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`relative w-full ${SIZE_CLS[size]} bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[calc(100vh-4rem)] mt-8`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FormField helpers
// ─────────────────────────────────────────────────────────────────────────────
const base = 'w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400/20 transition-colors disabled:opacity-50';

function FormInput({ label, required, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">{label}{required && <span className="text-red-500"> *</span>}</label>
      <input className={`${base} ${error ? 'border-red-400' : ''}`} {...props} />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function FormSelect({ label, required, error, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">{label}{required && <span className="text-red-500"> *</span>}</label>
      <select className={`${base} ${error ? 'border-red-400' : ''}`} {...props}>{children}</select>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Avatar
// ─────────────────────────────────────────────────────────────────────────────
function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  const colors = ['bg-blue-500','bg-purple-500','bg-green-500','bg-orange-500','bg-pink-500','bg-teal-500'];
  const color  = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`w-10 h-10 ${color} rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0`}>
      {initials}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Role styles
// ─────────────────────────────────────────────────────────────────────────────
const ROLE_STYLES: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
  admin:       'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  manager:     'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
  user:        'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  viewer:      'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
};

// ─────────────────────────────────────────────────────────────────────────────
// SkillPicker
// ─────────────────────────────────────────────────────────────────────────────
const SKILL_CATEGORIES = ['Technical','Managerial','Field','Finance','IT','Legal'];

function SkillPicker({ allSkills, selected, onChange }: { allSkills: Skill[]; selected: number[]; onChange: (ids: number[]) => void }) {
  const toggle = (id: number) => onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  return (
    <div className="space-y-3">
      {SKILL_CATEGORIES.map(cat => {
        const catSkills = allSkills.filter(s => s.category === cat);
        if (!catSkills.length) return null;
        return (
          <div key={cat}>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{cat}</p>
            <div className="flex flex-wrap gap-1.5">
              {catSkills.map(s => (
                <button key={s.skill_id} type="button" onClick={() => toggle(s.skill_id)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                    selected.includes(s.skill_id)
                      ? 'bg-brand-500 text-white border-brand-500'
                      : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-brand-400'
                  }`}>{s.name}</button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UserForm
// ─────────────────────────────────────────────────────────────────────────────
function UserForm({ user, allSkills, isSuperAdmin: superAdmin, onSaved, onClose }: {
  user?: UserRecord; allSkills: Skill[]; isSuperAdmin: boolean; onSaved: () => void; onClose: () => void;
}) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    full_name: user?.full_name ?? '',
    username:  user?.username  ?? '',
    email:     user?.email     ?? '',
    mobile:    user?.mobile    ?? '',
    gender:    user?.gender    ?? 'male',
    role:      user?.role      ?? 'user',
    status:    user?.status    ?? 'active',
    password:  '',
  });
  const [selectedSkills, setSelectedSkills] = useState<number[]>(user?.skills?.map(s => s.skill_id) ?? []);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.username.trim()) { setError('Full name and username are required'); return; }
    if (!isEdit && !form.password.trim()) { setError('Password is required for new users'); return; }
    setSaving(true); setError('');
    try {
      let userId = user?.user_id;
      if (isEdit) {
        const payload: any = { full_name: form.full_name, email: form.email || null, mobile: form.mobile || null, gender: form.gender, role: form.role, status: form.status };
        await client.patch(`/v1/users/${user!.user_id}`, payload);
      } else {
        const res = await client.post<UserRecord>('/v1/users', { ...form, email: form.email || null, mobile: form.mobile || null });
        userId = res.data.user_id;
      }
      if (userId) await client.put(`/v1/users/${userId}/skills`, { skill_ids: selectedSkills });
      toast.success(isEdit ? 'User updated' : 'User created');
      onSaved(); onClose();
    } catch (err: any) {
      const m = err?.response?.data?.message ?? 'Failed to save user';
      toast.error('Save failed', m);
      setError(m);
    } finally { setSaving(false); }
  };

  const availableRoles = superAdmin
    ? [['viewer','Viewer'],['user','User'],['manager','Manager'],['admin','Admin'],['super_admin','Super Admin']]
    : [['viewer','Viewer'],['user','User'],['manager','Manager'],['admin','Admin']];

  return (
    <form onSubmit={save} className="space-y-4">
      {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 p-3 rounded-lg">{error}</p>}
      <FormInput label="Full Name" required value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="e.g. John Doe" />
      <div className="grid grid-cols-2 gap-3">
        <FormInput label="Username" required value={form.username} onChange={e => set('username', e.target.value)} placeholder="johndoe" disabled={isEdit} />
        <FormInput label="Email" type="email" value={form.email ?? ''} onChange={e => set('email', e.target.value)} placeholder="john@example.com" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormInput label="Mobile" value={form.mobile ?? ''} onChange={e => set('mobile', e.target.value)} placeholder="+255712345678" />
        <FormSelect label="Gender" value={form.gender ?? 'male'} onChange={e => set('gender', e.target.value)}>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </FormSelect>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormSelect label="Role" required value={form.role} onChange={e => set('role', e.target.value)}>
          {availableRoles.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </FormSelect>
        {isEdit && (
          <FormSelect label="Status" value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </FormSelect>
        )}
      </div>
      {!isEdit && (
        <FormInput label="Password" required type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Temporary password (min 8 chars)" />
      )}
      {allSkills.length > 0 && (
        <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-3">
            Skills <span className="font-normal text-gray-400">({selectedSkills.length} selected)</span>
          </p>
          <SkillPicker allSkills={allSkills} selected={selectedSkills} onChange={setSelectedSkills} />
        </div>
      )}
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
        <button type="submit" disabled={saving} className="px-5 py-2 text-sm font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50">
          {saving ? 'Saving...' : isEdit ? 'Update User' : 'Create User'}
        </button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ResetPasswordForm
// ─────────────────────────────────────────────────────────────────────────────
function ResetPasswordForm({ user, onClose }: { user: UserRecord; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);
  const handleReset = async () => {
    setSaving(true);
    try { await client.patch(`/v1/users/${user.user_id}`, { must_change_password: 1 }); setDone(true); }
    finally { setSaving(false); }
  };
  if (done) return (
    <div className="text-center py-4 space-y-3">
      <div className="w-12 h-12 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
        <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">User will be prompted to change password on next login.</p>
      <button onClick={onClose} className="px-4 py-2 text-sm bg-brand-500 text-white rounded-lg hover:bg-brand-600">Close</button>
    </div>
  );
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        This will flag <strong className="text-gray-700 dark:text-gray-300">{user.full_name}</strong> to change their password on next login.
      </p>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg text-gray-600">Cancel</button>
        <button onClick={handleReset} disabled={saving} className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50">
          {saving ? 'Processing...' : 'Force Password Reset'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const { user: me, isSuperAdmin } = useAuth();
  const [data,       setData]      = useState<PaginatedResponse<UserRecord> | null>(null);
  const [allSkills,  setAllSkills] = useState<Skill[]>([]);
  const [loading,    setLoading]   = useState(true);
  const [search,     setSearch]    = useState('');
  const [roleFilter, setRoleFilter]= useState('');
  const [page,       setPage]      = useState(1);
  const [modal,      setModal]     = useState<'create'|'edit'|'delete'|'reset'|null>(null);
  const [selected,   setSelected]  = useState<UserRecord | null>(null);
  const [deleting,   setDeleting]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 12 };
      if (search)     params.search = search;
      if (roleFilter) params.role   = roleFilter;
      const qs = new URLSearchParams(params).toString();
      const res = await client.get<PaginatedResponse<UserRecord>>(`/v1/users?${qs}`);
      setData(res.data);
    } finally { setLoading(false); }
  }, [page, search, roleFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    client.get<Skill[]>('/v1/users/meta/skills').then(r => setAllSkills(r.data)).catch(() => {});
  }, []);

  const handleDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try { await client.delete(`/v1/users/${selected.user_id}`); toast.success('User deactivated'); await load(); setModal(null); }
    finally { setDeleting(false); }
  };

  return (
    <div className="p-6 space-y-5">
      <ToastContainer />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">Users</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{data?.totalResults ?? 0} total users</p>
        </div>
        <button onClick={() => { setSelected(null); setModal('create'); }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New User
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input type="text" placeholder="Search name, username, email..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 min-w-[200px] rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm dark:bg-gray-900 dark:text-white focus:outline-none focus:border-brand-400" />
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm dark:bg-gray-900 dark:text-white focus:outline-none focus:border-brand-400">
          <option value="">All Roles</option>
          <option value="viewer">Viewer</option>
          <option value="user">User</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
          {isSuperAdmin && <option value="super_admin">Super Admin</option>}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">User</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Username</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Role</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" /><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" /></div></td>
                      {Array.from({ length: 4 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-20" /></td>)}
                    </tr>
                  ))
                : !data?.results?.length
                ? <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">No users found</td></tr>
                : data.results.map(u => (
                    <tr key={u.user_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.full_name} />
                          <div>
                            <p className="font-medium text-gray-800 dark:text-white">{u.full_name}</p>
                            {u.email && <p className="text-xs text-gray-400">{u.email}</p>}
                            {u.skills && u.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {u.skills.slice(0, 3).map(s => (
                                  <span key={s.skill_id} className="px-1.5 py-0.5 text-[10px] rounded bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400">{s.name}</span>
                                ))}
                                {u.skills.length > 3 && <span className="text-[10px] text-gray-400">+{u.skills.length - 3} more</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{u.username}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full capitalize ${ROLE_STYLES[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                          {u.role.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${u.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'}`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setSelected(u); setModal('edit'); }} className="px-2.5 py-1 text-xs text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-md">Edit</button>
                          <button onClick={() => { setSelected(u); setModal('reset'); }} className="px-2.5 py-1 text-xs text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-500/10 rounded-md">Reset PW</button>
                          {me?.user_id !== u.user_id && (
                            <button onClick={() => { setSelected(u); setModal('delete'); }} className="px-2.5 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md">Delete</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">Page {data.page} of {data.totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800">Previous</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= data.totalPages} className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal isOpen={modal === 'create'} onClose={() => setModal(null)} title="Create New User" size="md">
        <UserForm allSkills={allSkills} isSuperAdmin={isSuperAdmin} onSaved={load} onClose={() => setModal(null)} />
      </Modal>
      <Modal isOpen={modal === 'edit' && !!selected} onClose={() => setModal(null)} title="Edit User" size="md">
        {selected && <UserForm user={selected} allSkills={allSkills} isSuperAdmin={isSuperAdmin} onSaved={load} onClose={() => setModal(null)} />}
      </Modal>
      <Modal isOpen={modal === 'reset' && !!selected} onClose={() => setModal(null)} title="Reset Password" size="sm">
        {selected && <ResetPasswordForm user={selected} onClose={() => setModal(null)} />}
      </Modal>
      <Modal isOpen={modal === 'delete' && !!selected} onClose={() => setModal(null)} title="Deactivate User" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Deactivate <strong className="text-gray-800 dark:text-white">"{selected?.full_name}"</strong>? They will no longer be able to log in.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setModal(null)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400">Cancel</button>
            <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50">
              {deleting ? 'Deactivating...' : 'Deactivate'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
