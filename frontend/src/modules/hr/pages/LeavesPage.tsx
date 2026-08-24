/**
 * Leaves — Applications + Types
 * Uses the NewTheme DatePicker component throughout.
 */
import { useEffect, useState } from 'react';
import client from '../../../api/client';
import PageShell from '../components/ui/PageShell';
import Table from '../components/ui/Table';
import Badge, { statusVariant } from '../components/ui/Badge';
import DatePicker from '../components/ui/DatePicker';
import PersonPicker, { type RosterPerson } from '../components/pickers/PersonPicker';
import { formatDate } from '../../../utils/date';

type Tab = 'applications' | 'types' | 'pending';

const selCls = 'w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-white focus:outline-none focus:border-brand-400';
const lblCls = 'block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5';

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-10 px-4 pb-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 max-h-[88vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ── Add / Edit leave form ──────────────────────────────────────────────────────
function AddLeaveForm({ onSuccess, onClose, editData }: { onSuccess: () => void; onClose: () => void; editData?: any }) {
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [regions,    setRegions]    = useState<any[]>([]);
  const [districts,  setDistricts]  = useState<any[]>([]);
  const [relatives,  setRelatives]  = useState<{ full_name: string; relationship: string }[]>([]);
  // Who this leave is for. Left empty = self (the logged-in URA user).
  // HR/admin picks a specific person (staff or guard) to apply on their behalf.
  const [applicant,  setApplicant]  = useState<RosterPerson | null>(
    editData?.applicant_type ? {
      person_type: editData.applicant_type,
      person_id: editData.applicant_type === 'guard' ? editData.guard_id : editData.user_id,
      full_name: editData.requested_by_name,
    } : null
  );
  const [submitting, setSubmitting] = useState(false);
  const [err,        setErr]        = useState('');
  const [fareAllowed, setFareAllowed] = useState(false);
  const [maxDays,    setMaxDays]    = useState<number|null>(null);

  const [form, setForm] = useState({
    leave_type_id: '', start_date: '', leave_days: '', end_date: '',
    village: '', reason: '', region_id: '', region_name: '',
    district_id: '', district_name: '',
  });

  useEffect(() => {
    client.get('/v1/hr/masters/leaves-types')
      .then(r => setLeaveTypes(r.data?.data ?? r.data?.results ?? r.data ?? []))
      .catch(() => {});
    client.get('/tpa/regions/')
      .then(r => { const rows = r.data?.data ?? r.data?.results ?? r.data ?? []; setRegions(Array.isArray(rows) ? rows : []); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!editData?.id) return;
    setForm({
      leave_type_id: editData.leave_type_id ?? '', start_date: editData.start_date ?? '',
      leave_days: editData.leave_days ?? '', end_date: editData.end_date ?? '',
      village: editData.village ?? '', reason: editData.reason ?? '',
      region_id: editData.region_id ?? '', region_name: editData.region_name ?? '',
      district_id: editData.district_id ?? '', district_name: editData.district_name ?? '',
    });
    if (editData.region_id) {
      client.get('/tpa/districts/', { params: { id: editData.region_id } })
        .then(r => setDistricts(r.data?.data ?? r.data?.results ?? r.data ?? []))
        .catch(() => {});
    }
    setRelatives(editData.relatives ?? []);
  }, [editData?.id]);

  // auto-calc end date
  useEffect(() => {
    if (form.start_date && Number(form.leave_days) > 0) {
      const d = new Date(form.start_date);
      d.setDate(d.getDate() + parseInt(form.leave_days) - 1);
      setForm(f => ({ ...f, end_date: d.toISOString().split('T')[0] }));
    } else {
      setForm(f => ({ ...f, end_date: '' }));
    }
  }, [form.start_date, form.leave_days]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleLeaveType = (id: string) => {
    const lt = leaveTypes.find((t: any) => String(t.id) === id);
    setFareAllowed(lt?.allow_fare === 1 || lt?.allow_fare === true);
    setMaxDays(lt?.days ?? null);
    set('leave_type_id', id);
    if (lt?.days && Number(form.leave_days) > lt.days) set('leave_days', String(lt.days));
  };

  const handleRegion = (id: string) => {
    const r = regions.find((x: any) => String(x.id) === id);
    setForm(f => ({ ...f, region_id: id, region_name: r?.name ?? '', district_id: '', district_name: '' }));
    setDistricts([]);
    if (id) client.get('/tpa/districts/', { params: { id } })
      .then(r => setDistricts(r.data?.data ?? r.data?.results ?? r.data ?? []))
      .catch(() => {});
  };

  const handleDistrict = (id: string) => {
    const d = districts.find((x: any) => String(x.id) === id);
    setForm(f => ({ ...f, district_id: id, district_name: d?.name ?? '' }));
  };

  const handleDays = (v: string) => {
    if (v === '') { set('leave_days', ''); return; }
    const n = parseInt(v, 10);
    if (isNaN(n)) return;
    set('leave_days', String(maxDays !== null && n > maxDays ? maxDays : n));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setSubmitting(true);
    try {
      const applicantRef = applicant
        ? { user_id: applicant.person_type === 'user' ? applicant.person_id : undefined,
            guard_id: applicant.person_type === 'guard' ? applicant.person_id : undefined }
        : {};
      const r = await client.post('/v1/hr/masters/leaves-applications', { payload: { ...form, ...applicantRef, relatives } });
      if (r.data?.status) { onSuccess(); onClose(); }
      else setErr(r.data?.message || 'Submission failed');
    } catch (e: any) { setErr(e?.response?.data?.message || e?.response?.data?.error || 'Something went wrong'); }
    finally { setSubmitting(false); }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fareAllowed && (
        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-xs text-blue-700 dark:text-blue-400">
          This leave type includes travel fare reimbursement. Fare amounts will be entered during approval.
        </div>
      )}
      {err && <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 text-xs text-red-600 dark:text-red-400">{err}</div>}

      {!editData?.id && (
        <PersonPicker
          label="Applying for (leave blank to apply for yourself)"
          value={applicant}
          onChange={setApplicant}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Leave type */}
        <div>
          <label className={lblCls}>Leave Type <span className="text-red-500">*</span></label>
          <select required value={form.leave_type_id} onChange={e => handleLeaveType(e.target.value)} className={selCls}>
            <option value="">Select leave type</option>
            {leaveTypes.map((t: any) => <option key={t.id} value={t.id}>{t.name} ({t.days} days)</option>)}
          </select>
        </div>

        {/* Start date — NewTheme DatePicker */}
        <DatePicker
          label="Start Date"
          required
          value={form.start_date}
          onChange={v => set('start_date', v)}
          min={today}
        />

        {/* Leave days */}
        <div>
          <label className={lblCls}>
            Leave Days <span className="text-red-500">*</span>
            {maxDays !== null && (
              <span className="ml-2 text-[10px] bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-full border border-brand-200 dark:border-brand-500/30">
                max {maxDays}
              </span>
            )}
          </label>
          <input type="number" required min={1} max={maxDays ?? undefined}
            placeholder={maxDays !== null ? `1 – ${maxDays}` : 'Select leave type first'}
            disabled={maxDays === null}
            value={form.leave_days} onChange={e => handleDays(e.target.value)}
            className={'w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-white focus:outline-none focus:border-brand-400 placeholder-gray-400' + (maxDays === null ? ' opacity-50 cursor-not-allowed' : '')} />
        </div>

        {/* End date — read-only DatePicker */}
        <DatePicker
          label="End Date"
          hint="Auto-calculated"
          value={form.end_date}
          onChange={() => {}}
          readOnly
          disabled
        />

        {/* Region */}
        <div>
          <label className={lblCls}>Region <span className="text-red-500">*</span></label>
          <select required value={form.region_id} onChange={e => handleRegion(e.target.value)} className={selCls}>
            <option value="">Select region</option>
            {regions.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>

        {/* District */}
        <div>
          <label className={lblCls}>District <span className="text-red-500">*</span></label>
          <select required value={form.district_id} onChange={e => handleDistrict(e.target.value)}
            disabled={!form.region_id} className={selCls + (!form.region_id ? ' opacity-50 cursor-not-allowed' : '')}>
            <option value="">Select district</option>
            {districts.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

        {/* Village */}
        <div>
          <label className={lblCls}>Village</label>
          <input type="text" placeholder="Enter village name" disabled={!form.district_id}
            value={form.village} onChange={e => set('village', e.target.value)}
            className={'w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-white focus:outline-none focus:border-brand-400 placeholder-gray-400' + (!form.district_id ? ' opacity-50 cursor-not-allowed' : '')} />
        </div>

      </div>

      {/* Reason */}
      <div>
        <label className={lblCls}>Reason <span className="text-red-500">*</span></label>
        <textarea required minLength={10} rows={3} placeholder="Reason for leave (min 10 characters)"
          value={form.reason} onChange={e => set('reason', e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-white focus:outline-none focus:border-brand-400 placeholder-gray-400 resize-none" />
      </div>

      {/* Travelling relatives */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-white">Travelling Relatives</p>
            <p className="text-xs text-gray-400">Family members travelling with you</p>
          </div>
          <button type="button"
            onClick={() => setRelatives(r => [...r, { full_name: '', relationship: '' }])}
            className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 border border-brand-300 dark:border-brand-600 px-3 py-1.5 rounded-lg transition-colors">
            + Add Relative
          </button>
        </div>
        {relatives.length === 0
          ? <p className="text-xs text-gray-400 text-center py-2">No relatives added</p>
          : relatives.map((rel, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-3 mb-2 items-center">
              <input type="text" placeholder="Full name" required value={rel.full_name}
                onChange={e => setRelatives(r => r.map((x, j) => j === i ? { ...x, full_name: e.target.value } : x))}
                className="h-9 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-white focus:outline-none focus:border-brand-400 placeholder-gray-400" />
              <select required value={rel.relationship}
                onChange={e => setRelatives(r => r.map((x, j) => j === i ? { ...x, relationship: e.target.value } : x))}
                className={selCls + ' h-9 text-xs'}>
                <option value="">Relationship</option>
                {['Wife','Husband','Son','Daughter','Family Member'].map(v => (
                  <option key={v} value={v.toLowerCase().replace(' ','_')}>{v}</option>
                ))}
              </select>
              <button type="button"
                onClick={() => setRelatives(r => r.filter((_, j) => j !== i))}
                className="w-9 h-9 flex items-center justify-center rounded-lg border border-red-200 dark:border-red-500/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex-shrink-0">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>
                </svg>
              </button>
            </div>
          ))
        }
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={submitting}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white transition-colors">
          {submitting ? 'Submitting…' : editData?.id ? 'Update Application' : 'Submit Application'}
        </button>
      </div>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LeavesPage({ tab = 'applications' }: { tab?: Tab }) {
  const [data,    setData]  = useState<any[]>([]);
  const [loading, setLoad]  = useState(true);
  const [error,   setError] = useState('');
  const [modal,   setModal] = useState(false);
  const [view,    setView]  = useState<any>(null);
  const [edit,    setEdit]  = useState<any>(null);

  const isTypes   = tab === 'types';
  const isPending = tab === 'pending';

  const load = () => {
    setLoad(true); setError('');
    if (isTypes) {
      client.get('/v1/hr/masters/leaves-types')
        .then(r => setData(r.data?.data ?? r.data?.results ?? r.data ?? []))
        .catch(e => setError(e?.response?.data?.message || 'Failed to load'))
        .finally(() => setLoad(false));
    } else {
      const status = isPending ? 'pending' : '';
      client.get('/v1/hr/masters/leaves-applications', { params: { status, isForOwner: !isPending } })
        .then(r => setData(r.data?.data ?? r.data?.results ?? r.data ?? []))
        .catch(e => setError(e?.response?.data?.message || 'Failed to load'))
        .finally(() => setLoad(false));
    }
  };

  useEffect(() => { load(); }, [tab]);

  if (isTypes) return (
    <PageShell title="Leave Types" subtitle={`${data.length} types configured`}>
      {error && <div className="mb-4 p-3 rounded-xl bg-red-50 text-sm text-red-600 border border-red-200">{error}</div>}
      <Table loading={loading} data={data} rowKey={r => r.id ?? Math.random()} columns={[
        { header: 'Leave Type',   render: r => <span className="font-semibold text-gray-800 dark:text-white">{r.name ?? '—'}</span> },
        { header: 'Days Allowed', render: r => <Badge label={`${r.days ?? r.days_allowed ?? '—'} days`} variant="brand" /> },
        { header: 'Travel Fare',  render: r => <Badge label={r.allow_fare ? 'Allowed' : 'Not Allowed'} variant={r.allow_fare ? 'success' : 'default'} /> },
        { header: 'Description',  key: 'description' },
      ]} />
    </PageShell>
  );

  return (
    <>
      <PageShell
        title={isPending ? 'Pending Leave Applications' : 'Leave Applications'}
        subtitle={`${data.length} application${data.length !== 1 ? 's' : ''}`}
        actions={
          !isPending ? (
            <button onClick={() => { setEdit(null); setModal(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-brand-500 hover:bg-brand-600 text-white transition-colors">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Apply for Leave
            </button>
          ) : undefined
        }
      >
        {error && <div className="mb-4 p-3 rounded-xl bg-red-50 text-sm text-red-600 border border-red-200">{error}</div>}
        <Table loading={loading} data={data} rowKey={r => r.id ?? Math.random()} columns={[
          { header: 'Applicant', render: r => (
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${r.applicant_type === 'guard' ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400'}`}>
                {r.applicant_type === 'guard' ? 'Guard' : 'Staff'}
              </span>
              <div>
                <p className="font-semibold text-gray-800 dark:text-white text-sm">{r.requested_by_name ?? '—'}</p>
                <p className="text-xs text-gray-400">{r.user_email ?? ''}</p>
              </div>
            </div>
          )},
          { header: 'Leave Type', render: r => <span className="text-gray-600 dark:text-gray-400">{r.leave_type_name ?? r.leave_type ?? '—'}</span> },
          { header: 'Duration', render: r => (
            <div className="text-xs">
              <p className="text-gray-600 dark:text-gray-400">{formatDate(r.start_date)} — {formatDate(r.end_date)}</p>
              <p className="font-semibold text-gray-700 dark:text-gray-300">{r.leave_days ?? '?'} days</p>
            </div>
          )},
          { header: 'Status', render: r => <Badge label={r.status ?? 'pending'} variant={statusVariant(r.status)} /> },
          { header: 'Actions', render: r => (
            <div className="flex gap-1.5">
              <button onClick={() => setView(r)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-100 transition-colors">
                View
              </button>
              {r.status === 'pending' && !isPending && (
                <button onClick={() => { setEdit(r); setModal(true); }}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-100 transition-colors">
                  Edit
                </button>
              )}
            </div>
          )},
        ]} />
      </PageShell>

      <Modal open={modal} onClose={() => setModal(false)}
        title={edit?.id ? 'Edit Leave Application' : 'Apply for Leave'}>
        <AddLeaveForm editData={edit} onSuccess={load} onClose={() => setModal(false)} />
      </Modal>

      <Modal open={!!view} onClose={() => setView(null)} title="Leave Application Details">
        {view && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Employee',   view.requested_by_name],
                ['Leave Type', view.leave_type_name ?? view.leave_type],
                ['Start Date', formatDate(view.start_date)],
                ['End Date',   formatDate(view.end_date)],
                ['Days',       view.leave_days],
                ['Status',     view.status],
                ['Region',     view.region_name],
                ['District',   view.district_name],
                ['Village',    view.village],
              ].map(([l, v]) => (
                <div key={l}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">{l}</p>
                  {l === 'Status'
                    ? <Badge label={String(v ?? '—')} variant={statusVariant(String(v))} />
                    : <p className="text-sm font-medium text-gray-800 dark:text-white">{v || '—'}</p>}
                </div>
              ))}
            </div>
            {view.reason && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Reason</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-xl p-3">{view.reason}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
