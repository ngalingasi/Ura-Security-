/**
 * Payroll Management — 4 tabs via prop
 *
 * /salary-scale        → Salary Scales      (CRUD)
 * /assign-salary-scale → Assign Salary      (assign scale to employee)
 * /salary-list         → Payroll List       (generate salary, edit amount)
 * /salary-slips        → Salary Slips       (preview & print payslip)
 *
 * APIs:
 *   GET/POST /payroll/salary-scale                  { payload }
 *   DELETE   /payroll/salary-scale?scale_id=X
 *   GET/POST /payroll/employee-salary-scale         { payload }
 *   DELETE   /payroll/employee-salary-list?salary_id=X
 *   POST     /payroll/edit-employee-salary          { payload }
 *   GET      /payroll/employee-salary-list
 *   POST     /payroll/generate-payroll              { payload: employees[] }
 *   GET      /payroll/generated-payrolls
 *   POST     /payroll/generate-payroll-sheet        { payload }  → blob download
 */
import { useEffect, useState, useCallback } from 'react';
import client from '../../../api/client';
import { getCdnImageUrl } from '../../hr/api/hrFiles';
import PageShell from '../../hr/components/ui/PageShell';
import { useImagePreview } from '../../hr/context/ImagePreviewContext';

type Tab = 'scales' | 'assign' | 'components' | 'list' | 'slips' | 'report';

const fmtCur = (v?: number | string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TSH' }).format(Number(v ?? 0));
const fmtDate = (d?: string) => { try { return new Date(d!).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return d ?? '—'; } };
const fmtMonth = (d?: string) => { try { const dt = new Date(d!); return `${dt.toLocaleString('en',{month:'long'})} ${dt.getFullYear()}`; } catch { return d ?? '—'; } };
const fullName = (u: any) => u?.full_name || '?';
const personKey = (u: any) => `${u?.person_type ?? 'x'}-${u?.person_id ?? Math.random()}`;
const initsOf  = (n: string) => { const p = n.trim().split(/\s+/); return (p.length===1?p[0].slice(0,2):p[0][0]+p[p.length-1][0]).toUpperCase(); };
const COLORS   = ['bg-brand-500','bg-green-500','bg-purple-500','bg-orange-500','bg-pink-500','bg-teal-500'];
const colorFor = (n:string) => { let h=0; for(let i=0;i<n.length;i++) h=n.charCodeAt(i)+((h<<5)-h); return COLORS[Math.abs(h)%COLORS.length]; };
const inCls  = 'w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-white focus:outline-none focus:border-brand-400 placeholder-gray-400';
const selCls = 'w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:border-brand-400 appearance-none';
const lblCls = 'block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5';

function Spin({ size='md' }:{ size?:'sm'|'md' }) {
  return <div className={`${size==='sm'?'w-4 h-4 border-2':'w-6 h-6 border-[3px]'} border-brand-500 border-t-transparent rounded-full animate-spin inline-block`}/>;
}
function Toast({ msg, type }:{ msg:string; type:'success'|'error' }) {
  if (!msg) return null;
  return <div className={`fixed top-4 right-4 z-[99999] px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg ${type==='success'?'bg-brand-600':'bg-red-600'} text-white`}>{msg}</div>;
}
function Modal({ open, onClose, title, size='md', children }:{ open:boolean; onClose:()=>void; title:string; size?:'sm'|'md'|'lg'; children:React.ReactNode }) {
  useEffect(()=>{ document.body.style.overflow=open?'hidden':''; return()=>{ document.body.style.overflow=''; }; },[open]);
  if (!open) return null;
  const w = size==='sm'?'max-w-sm':size==='lg'?'max-w-2xl':'max-w-lg';
  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-8 px-4 pb-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50"/>
      <div className={`relative w-full ${w} bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 max-h-[90vh] flex flex-col`} onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function F({ label, required, error, children }:{ label:string; required?:boolean; error?:string; children:React.ReactNode }) {
  return <div><label className={lblCls}>{label}{required&&<span className="text-red-500 ml-0.5">*</span>}</label>{children}{error&&<p className="text-xs text-red-500 mt-1">{error}</p>}</div>;
}

function EmpAvatar({ emp }:{ emp:any }) {
  const n = fullName(emp);
  const src = getCdnImageUrl(emp.photo_url ?? emp.image);
  const { open } = useImagePreview();
  const clickable = !!src;
  return (
    <div className={`w-9 h-9 ${colorFor(n)} rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden relative group/avatar ${clickable?'cursor-pointer':''}`}
      onClick={clickable ? (e)=>{e.stopPropagation();open(src!,n);} : undefined} title={clickable?'Click to preview photo':undefined}>
      {src ? <img src={src} alt={n} className="w-full h-full object-cover" style={{height:'100%'}} onError={e=>{(e.currentTarget as HTMLImageElement).style.display='none';}} /> : initsOf(n)}
      {clickable && <div className="absolute inset-0 bg-black/0 group-hover/avatar:bg-black/40 flex items-center justify-center transition-colors"><svg className="w-3.5 h-3.5 text-white opacity-0 group-hover/avatar:opacity-100 transition-opacity" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V6a2 2 0 012-2h2M4 16v2a2 2 0 002 2h2m8-16h2a2 2 0 012 2v2m-4 12h2a2 2 0 002-2v-2"/></svg></div>}
    </div>
  );
}

// ── Row menu ──────────────────────────────────────────────────────────────────
function RowMenu({ items }:{ items:{ label:string; icon?:string; danger?:boolean; onClick:()=>void }[] }) {
  const [open, setOpen] = useState(false);
  useEffect(()=>{ if(!open) return; const c=()=>setOpen(false); document.addEventListener('click',c); return()=>document.removeEventListener('click',c); },[open]);
  return (
    <div className="relative" onClick={e=>e.stopPropagation()}>
      <button onClick={()=>setOpen(v=>!v)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl z-50 py-1 overflow-hidden">
          {items.map((item,i)=>(
            <button key={i} onClick={()=>{setOpen(false);item.onClick();}}
              className={`flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-left transition-colors ${item.danger?'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10':'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 1 — SALARY SCALES
// ══════════════════════════════════════════════════════════════════════════════
function SalaryScalesTab() {
  const [scales,  setScales]   = useState<any[]>([]);
  const [loading, setLoading]  = useState(true);
  const [modal,   setModal]    = useState(false);
  const [active,  setActive]   = useState<any>(null);
  const [form,    setForm]     = useState({ scale_name:'', scale_amount:'', scale_increament:'' });
  const [errors,  setErrors]   = useState<Record<string,string>>({});
  const [saving,  setSaving]   = useState(false);
  const [toast,   setToast]    = useState({ msg:'', type:'success' as 'success'|'error' });
  const show = (msg:string, type:'success'|'error'='success') => { setToast({msg,type}); setTimeout(()=>setToast({msg:'',type:'success'}),3000); };

  const load = useCallback(async()=>{
    setLoading(true);
    try { const r=await client.get('/v1/hr/payroll/salary-scale'); setScales(r.data?.data??[]); }
    catch{} finally{setLoading(false);}
  },[]);
  useEffect(()=>{load();},[load]);

  const openAdd  = ()=>{ setActive(null); setForm({scale_name:'',scale_amount:'',scale_increament:''}); setErrors({}); setModal(true); };
  const openEdit = (s:any)=>{ setActive(s); setForm({scale_name:s.scale_name,scale_amount:s.scale_amount,scale_increament:s.scale_increament}); setErrors({}); setModal(true); };

  const validate = ()=>{
    const e:Record<string,string>={};
    if(!form.scale_name.trim())      e.scale_name='Required';
    if(!form.scale_amount)           e.scale_amount='Required';
    if(!form.scale_increament)       e.scale_increament='Required';
    setErrors(e); return Object.keys(e).length===0;
  };

  const handleSubmit = async(e:React.FormEvent)=>{
    e.preventDefault(); if(!validate()) return; setSaving(true);
    try {
      const payload = active?.salary_scale_id ? { ...form, salary_scale_id: active.salary_scale_id } : form;
      const r=await client.post('/v1/hr/payroll/salary-scale',{payload});
      if(r.data?.status){show(r.data.message||'Saved');load();setModal(false);}
      else show(r.data?.message||'Failed','error');
    } catch(ex:any){show(ex?.response?.data?.message||'Error','error');}
    finally{setSaving(false);}
  };

  const handleDelete = async(s:any)=>{
    if(!confirm(`Delete scale "${s.scale_name}"?`)) return;
    try{
      const r=await client.delete(`/v1/hr/payroll/salary-scale?scale_id=${s.salary_scale_id}`);
      if(r.data?.status){show('Deleted');load();}else show(r.data?.message||'Failed','error');
    }catch(ex:any){show(ex?.response?.data?.message||'Error','error');}
  };

  return (<>
    <Toast msg={toast.msg} type={toast.type}/>
    <div className="flex items-center justify-between mb-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">{scales.length} scale{scales.length!==1?'s':''}</p>
      <button onClick={openAdd} className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-semibold bg-brand-500 hover:bg-brand-600 text-white transition-colors">
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Scale
      </button>
    </div>
    <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800/60"><tr>{['Scale Name','Amount (TSH)','Increment (TSH)',''].map(h=><th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
          {loading ? <tr><td colSpan={4} className="px-4 py-12 text-center"><Spin/></td></tr>
          : scales.length===0 ? <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-400">No salary scales yet.</td></tr>
          : scales.map(s=>(
            <tr key={s.salary_scale_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
              <td className="px-4 py-3 font-semibold text-gray-800 dark:text-white">{s.scale_name}</td>
              <td className="px-4 py-3 font-semibold text-green-600 dark:text-green-400">{fmtCur(s.scale_amount)}</td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{fmtCur(s.scale_increament)}</td>
              <td className="px-4 py-3">
                <RowMenu items={[
                  { label:'Edit',   onClick:()=>openEdit(s) },
                  { label:'Delete', danger:true, onClick:()=>handleDelete(s) },
                ]}/>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <Modal open={modal} onClose={()=>setModal(false)} title={active?`Edit — ${active.scale_name}`:'Add Salary Scale'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <F label="Scale Name" required error={errors.scale_name}>
              <input value={form.scale_name} onChange={e=>setForm(f=>({...f,scale_name:e.target.value}))} placeholder="e.g. Grade A" className={inCls}/>
            </F>
          </div>
          <F label="Scale Amount (TSH)" required error={errors.scale_amount}>
            <input type="number" value={form.scale_amount} onChange={e=>setForm(f=>({...f,scale_amount:e.target.value}))} placeholder="0.00" className={inCls}/>
          </F>
          <F label="Scale Increment (TSH)" required error={errors.scale_increament}>
            <input type="number" value={form.scale_increament} onChange={e=>setForm(f=>({...f,scale_increament:e.target.value}))} placeholder="0.00" className={inCls}/>
          </F>
        </div>
        <div className="flex gap-3 pt-2"><button type="button" onClick={()=>setModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button><button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white transition-colors flex items-center justify-center gap-2">{saving&&<Spin size="sm"/>}{saving?'Saving…':active?'Update':'Create'}</button></div>
      </form>
    </Modal>
  </>);
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 2 — ASSIGN SALARY SCALE
// ══════════════════════════════════════════════════════════════════════════════
function ComponentRow({ c, rows, toggle, setVal }: { c:any; rows:Record<number,{checked:boolean; value:string}>; toggle:(id:number)=>void; setVal:(id:number, value:string)=>void }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <input type="checkbox" checked={rows[c.id]?.checked||false} onChange={()=>toggle(c.id)} className="rounded flex-shrink-0"/>
      <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{c.name}</span>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <input type="number" step="0.01" disabled={!rows[c.id]?.checked} value={rows[c.id]?.value||''} onChange={e=>setVal(c.id, e.target.value)}
          className="w-28 h-8 px-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-white disabled:opacity-40 focus:outline-none focus:border-brand-400"/>
        <span className="text-xs text-gray-400 w-10">{c.calc_method==='percent_of_basic'?'%':'TSH'}</span>
      </div>
    </div>
  );
}

function EmployeeComponentsModal({ employee, onClose, onSuccess }:{ employee:any; onClose:()=>void; onSuccess:()=>void }) {
  const [catalog, setCatalog]   = useState<any[]>([]);
  const [assigned, setAssigned] = useState<any[]>([]);
  const [rows, setRows] = useState<Record<number,{checked:boolean; value:string}>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [cRes, aRes] = await Promise.all([
          client.get('/v1/hr/payroll/components', { params: { status: 'active' } }),
          client.get('/v1/hr/payroll/employee-components', { params: { person_type: employee.person_type, person_id: employee.person_id } }),
        ]);
        const cat = cRes.data?.data ?? [];
        const asg = aRes.data?.data ?? [];
        setCatalog(cat);
        setAssigned(asg);
        const initial: Record<number,{checked:boolean; value:string}> = {};
        for (const c of cat) {
          const existing = asg.find((a:any) => a.component_id === c.id && a.status === 'active');
          initial[c.id] = { checked: !!existing, value: String(existing ? existing.value : c.default_value) };
        }
        setRows(initial);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [employee.person_type, employee.person_id]);

  const toggle = (id:number) => setRows(r => ({ ...r, [id]: { ...r[id], checked: !r[id].checked } }));
  const setVal = (id:number, value:string) => setRows(r => ({ ...r, [id]: { ...r[id], value } }));

  const save = async () => {
    setSaving(true); setErr('');
    try {
      for (const c of catalog) {
        const row = rows[c.id];
        const wasAssigned = assigned.some((a:any) => a.component_id === c.id && a.status === 'active');
        if (row.checked) {
          await client.post('/v1/hr/payroll/employee-components', { person_type: employee.person_type, person_id: employee.person_id, component_id: c.id, value: row.value, status: 'active' });
        } else if (wasAssigned) {
          await client.delete(`/v1/hr/payroll/employee-components/${c.id}`, { params: { person_type: employee.person_type, person_id: employee.person_id } });
        }
      }
      onSuccess(); onClose();
    } catch (ex:any) { setErr(ex?.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const earnings   = catalog.filter(c => c.type === 'earning');
  const deductions = catalog.filter(c => c.type === 'deduction');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
        <EmpAvatar emp={employee}/>
        <div><p className="font-bold text-gray-800 dark:text-white">{fullName(employee)}</p><p className="text-xs text-gray-400">{employee.person_type==='guard'?'Security Guard':'Staff'} · Basic: {employee.assigned_amount?fmtCur(employee.assigned_amount):'—'}</p></div>
      </div>
      {err && <div className="p-3 rounded-xl bg-red-50 text-xs text-red-600 border border-red-200">{err}</div>}
      {loading ? (
        <div className="flex items-center justify-center py-10 gap-2 text-gray-400"><Spin/>Loading…</div>
      ) : catalog.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No components defined yet — add some on the Allowances &amp; Deductions tab first.</p>
      ) : (
        <div className="max-h-96 overflow-y-auto space-y-4">
          {earnings.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Earnings</p>
              {earnings.map(c => <ComponentRow key={c.id} c={c} rows={rows} toggle={toggle} setVal={setVal}/>)}
            </div>
          )}
          {deductions.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Deductions</p>
              {deductions.map(c => <ComponentRow key={c.id} c={c} rows={rows} toggle={toggle} setVal={setVal}/>)}
            </div>
          )}
        </div>
      )}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
        <button type="button" onClick={save} disabled={saving||loading} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white transition-colors flex items-center justify-center gap-2">{saving&&<Spin size="sm"/>}{saving?'Saving…':'Save'}</button>
      </div>
    </div>
  );
}

function AssignScaleModal({ employee, scales, onSubmitted, onClose }:{ employee:any; scales:any[]; onSubmitted:()=>void; onClose:()=>void }) {
  const [scaleId, setScaleId] = useState('');
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState('');

  const handleSubmit = async(e:React.FormEvent)=>{
    e.preventDefault(); if(!scaleId){setErr('Please select a salary scale');return;}
    const master = scales.find(s=>String(s.salary_scale_id)===scaleId);
    setSaving(true); setErr('');
    try{
      const r=await client.post('/v1/hr/payroll/employee-salary-scale',{ payload:{ person_type: employee.person_type, person_id: employee.person_id, salary_scale_id: scaleId, scale_amount: master?.scale_amount } });
      if(r.data?.status){onSubmitted();onClose();}else setErr(r.data?.message||'Failed');
    }catch(ex:any){setErr(ex?.response?.data?.message||'Error');}
    finally{setSaving(false);}
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Employee card */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
        <EmpAvatar emp={employee}/>
        <div>
          <p className="font-bold text-gray-800 dark:text-white">{fullName(employee)}</p>
          <p className="text-xs text-gray-400">{employee.designation_name||employee.role} · PF: {employee.pf_number||'—'}</p>
          <p className="text-xs text-gray-400">{employee.email}</p>
        </div>
      </div>
      {err&&<div className="p-3 rounded-xl bg-red-50 text-xs text-red-600 border border-red-200">{err}</div>}
      <F label="Select Salary Scale" required>
        <select value={scaleId} onChange={e=>setScaleId(e.target.value)} className={selCls}>
          <option value="">Choose scale…</option>
          {scales.map(s=><option key={s.salary_scale_id} value={String(s.salary_scale_id)}>{s.scale_name} — {fmtCur(s.scale_amount)}</option>)}
        </select>
      </F>
      <div className="flex gap-3 pt-2"><button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button><button type="submit" disabled={saving||!scaleId} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white transition-colors flex items-center justify-center gap-2">{saving&&<Spin size="sm"/>}{saving?'Assigning…':'Assign Scale'}</button></div>
    </form>
  );
}

function AssignSalaryTab() {
  const [employees, setEmps]    = useState<any[]>([]);
  const [scales,    setScales]  = useState<any[]>([]);
  const [loading,   setLoading] = useState(true);
  const [modal,     setModal]   = useState(false);
  const [compModal, setCompModal] = useState(false);
  const [selected,  setSelected]= useState<any>(null);
  const [search,    setSearch]  = useState('');
  const [toast,     setToast]   = useState({ msg:'', type:'success' as 'success'|'error' });
  const show = (msg:string, type:'success'|'error'='success') => { setToast({msg,type}); setTimeout(()=>setToast({msg:'',type:'success'}),3000); };

  const load = useCallback(async()=>{
    setLoading(true);
    try{ const r=await client.get('/v1/hr/payroll/employee-salary-scale'); setEmps(r.data?.data??[]); }
    catch{} finally{setLoading(false);}
  },[]);

  useEffect(()=>{
    load();
    client.get('/v1/hr/payroll/salary-scale').then(r=>setScales(r.data?.data??[])).catch(()=>{});
  },[load]);

  const filtered = search ? employees.filter(u=>fullName(u).toLowerCase().includes(search.toLowerCase())||String(u.pf_number||'').includes(search)) : employees;

  return (<>
    <Toast msg={toast.msg} type={toast.type}/>
    <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
      <p className="text-sm text-gray-500 dark:text-gray-400">{employees.length} employee{employees.length!==1?'s':''}</p>
      <div className="relative"><svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" className="h-9 pl-8 pr-3 w-52 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm placeholder-gray-400 focus:outline-none focus:border-brand-400"/></div>
    </div>
    <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800/60"><tr>{['PF Number','Employee','Salary Scale','Amount','Department','Joining Date',''].map(h=><th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
          {loading?<tr><td colSpan={7} className="px-4 py-12 text-center"><Spin/></td></tr>
          :filtered.length===0?<tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No employees.</td></tr>
          :filtered.map(u=>(
            <tr key={personKey(u)} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
              <td className="px-4 py-3 font-mono text-xs text-gray-500">{u.pf_number||'—'}</td>
              <td className="px-4 py-3"><div className="flex items-center gap-3"><EmpAvatar emp={u}/><div><p className="font-semibold text-gray-800 dark:text-white">{fullName(u)}</p><p className="text-xs text-gray-400">{u.designation_name}</p></div></div></td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{u.scale_name||<span className="text-gray-300 italic text-xs">Not assigned</span>}</td>
              <td className="px-4 py-3 font-semibold text-green-600 dark:text-green-400">{u.assigned_amount?fmtCur(u.assigned_amount):'—'}</td>
              <td className="px-4 py-3 text-gray-500">{u.department_name||'—'}</td>
              <td className="px-4 py-3 text-xs text-gray-400">{u.joining_date?fmtDate(u.joining_date):'—'}</td>
              <td className="px-4 py-3">
                <RowMenu items={[
                  { label:'Assign Salary Scale', onClick:()=>{setSelected(u);setModal(true);} },
                  { label:'Manage Allowances & Deductions', onClick:()=>{setSelected(u);setCompModal(true);} },
                ]}/>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <Modal open={modal} onClose={()=>setModal(false)} title="Assign Salary Scale">
      {modal&&selected&&<AssignScaleModal employee={selected} scales={scales} onSubmitted={()=>{load();show('Scale assigned');}} onClose={()=>setModal(false)}/>}
    </Modal>
    <Modal open={compModal} onClose={()=>setCompModal(false)} title="Allowances & Deductions" size="lg">
      {compModal&&selected&&<EmployeeComponentsModal employee={selected} onSuccess={()=>show('Components updated')} onClose={()=>setCompModal(false)}/>}
    </Modal>
  </>);
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 3 — PAYROLL LIST (generate salary)
// ══════════════════════════════════════════════════════════════════════════════
function EditSalaryModal({ employee, onSubmitted, onClose }:{ employee:any; onSubmitted:()=>void; onClose:()=>void }) {
  const [amount, setAmount] = useState(String(employee.assigned_amount||''));
  const [saving, setSaving] = useState(false); const [err, setErr] = useState('');
  const handleSubmit=async(e:React.FormEvent)=>{
    e.preventDefault(); if(!amount){setErr('Amount required');return;} setSaving(true); setErr('');
    try{const r=await client.post('/v1/hr/payroll/edit-employee-salary',{payload:{salary_assignment_id: employee.salary_assignment_id, salary_amount:amount}});if(r.data?.status){onSubmitted();onClose();}else setErr(r.data?.message||'Failed');}
    catch(ex:any){setErr(ex?.response?.data?.message||'Error');}finally{setSaving(false);}
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
        <EmpAvatar emp={employee}/>
        <div><p className="font-bold text-gray-800 dark:text-white">{fullName(employee)}</p><p className="text-xs text-gray-400">PF: {employee.pf_number||'—'} · Scale: {employee.scale_name||'—'}</p></div>
      </div>
      {err&&<div className="p-3 rounded-xl bg-red-50 text-xs text-red-600 border border-red-200">{err}</div>}
      <F label="Salary Amount (TSH)" required>
        <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} className={inCls}/>
      </F>
      <div className="flex gap-3 pt-2"><button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button><button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white transition-colors flex items-center justify-center gap-2">{saving&&<Spin size="sm"/>}{saving?'Saving…':'Update Amount'}</button></div>
    </form>
  );
}

// ── Allowances & Deductions catalog ──────────────────────────────────────────
function ComponentFormModal({ editItem, onClose, onSuccess }:{ editItem?:any; onClose:()=>void; onSuccess:()=>void }) {
  const isEdit = !!editItem?.id;
  const [name, setName] = useState(editItem?.name || '');
  const [type, setType] = useState<'earning'|'deduction'>(editItem?.type || 'earning');
  const [calcMethod, setCalcMethod] = useState<'fixed'|'percent_of_basic'>(editItem?.calc_method || 'fixed');
  const [defaultValue, setDefaultValue] = useState(String(editItem?.default_value ?? ''));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setErr('Name is required'); return; }
    setSaving(true); setErr('');
    try {
      const payload = { name, type, calc_method: calcMethod, default_value: defaultValue };
      const r = isEdit
        ? await client.put(`/v1/hr/payroll/components/${editItem.id}`, payload)
        : await client.post('/v1/hr/payroll/components', payload);
      if (r.data?.status) { onSuccess(); onClose(); } else setErr(r.data?.message || 'Failed');
    } catch (ex: any) { setErr(ex?.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {err && <div className="p-3 rounded-xl bg-red-50 text-xs text-red-600 border border-red-200">{err}</div>}
      <F label="Component Name" required>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. House Rent Allowance" className={inCls}/>
      </F>
      <F label="Type" required>
        <select value={type} onChange={e=>setType(e.target.value as any)} className={selCls} disabled={isEdit}>
          <option value="earning">Earning (adds to Gross Salary)</option>
          <option value="deduction">Deduction (subtracts from Net Pay)</option>
        </select>
      </F>
      <F label="Calculation Method" required>
        <select value={calcMethod} onChange={e=>setCalcMethod(e.target.value as any)} className={selCls}>
          <option value="fixed">Fixed amount (TSH)</option>
          <option value="percent_of_basic">Percentage of Basic Salary</option>
        </select>
      </F>
      <F label={calcMethod==='percent_of_basic' ? 'Default Rate (%)' : 'Default Amount (TSH)'} required>
        <input type="number" step="0.01" value={defaultValue} onChange={e=>setDefaultValue(e.target.value)} className={inCls}/>
      </F>
      <p className="text-xs text-gray-400">This is just the catalog default — each person's actual value is set individually when assigning it to them, on the Assign Salary tab.</p>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
        <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white transition-colors flex items-center justify-center gap-2">{saving&&<Spin size="sm"/>}{saving?'Saving…':isEdit?'Update Component':'Create Component'}</button>
      </div>
    </form>
  );
}

function PayrollComponentsTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [toast, setToast] = useState({ msg:'', type:'success' as 'success'|'error' });
  const show = (msg:string, type:'success'|'error'='success') => { setToast({msg,type}); setTimeout(()=>setToast({msg:'',type:'success'}),3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await client.get('/v1/hr/payroll/components'); setItems(r.data?.data ?? []); }
    catch { setItems([]); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const deactivate = async (item: any) => {
    if (!confirm(`Deactivate "${item.name}"? People currently assigned it will stop accruing it in future payroll runs.`)) return;
    try { await client.post(`/v1/hr/payroll/components/${item.id}/deactivate`); show('Component deactivated'); load(); }
    catch (ex: any) { show(ex?.response?.data?.message || 'Failed to deactivate', 'error'); }
  };

  const earnings   = items.filter(i => i.type === 'earning');
  const deductions = items.filter(i => i.type === 'deduction');

  const Section = ({ title, rows }: { title:string; rows:any[] }) => (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{title}</p>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800/40">
          <tr>{['Name','Method','Default','Status',''].map(h=>(
            <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">{h}</th>
          ))}</tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
          {rows.length === 0 ? (
            <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">None yet.</td></tr>
          ) : rows.map(item => (
            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
              <td className="px-4 py-2.5 font-semibold text-gray-800 dark:text-white">{item.name}</td>
              <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{item.calc_method==='percent_of_basic'?'% of Basic':'Fixed'}</td>
              <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{item.calc_method==='percent_of_basic'?`${item.default_value}%`:fmtCur(item.default_value)}</td>
              <td className="px-4 py-2.5">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${item.status==='active'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>{item.status}</span>
              </td>
              <td className="px-4 py-2.5">
                <div className="flex gap-1.5">
                  <button onClick={()=>{setEditItem(item);setModalOpen(true);}} className="h-7 px-2.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Edit</button>
                  {item.status!=='inactive' && <button onClick={()=>deactivate(item)} className="h-7 px-2.5 rounded-lg text-xs font-medium border border-red-200 text-red-500 hover:bg-red-50">Deactivate</button>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-5">
      <Toast msg={toast.msg} type={toast.type}/>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">Define the allowances and deductions available to assign to people. Each person's actual value is set individually on the Assign Salary tab.</p>
        <button onClick={()=>{setEditItem(null);setModalOpen(true);}} className="h-9 px-4 rounded-xl text-sm font-semibold bg-brand-500 hover:bg-brand-600 text-white transition-colors flex items-center gap-2 whitespace-nowrap flex-shrink-0">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Component
        </button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-gray-400"><Spin/>Loading…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Section title="Earnings (Allowances)" rows={earnings}/>
          <Section title="Deductions" rows={deductions}/>
        </div>
      )}
      <Modal open={modalOpen} onClose={()=>{setModalOpen(false);setEditItem(null);}} title={editItem?`Edit — ${editItem.name}`:'New Component'} size="md">
        {modalOpen && <ComponentFormModal editItem={editItem} onClose={()=>{setModalOpen(false);setEditItem(null);}} onSuccess={()=>{load();show(editItem?'Component updated':'Component created');}}/>}
      </Modal>
    </div>
  );
}

function PayrollListTab() {
  const [employees, setEmps]     = useState<any[]>([]);
  const [loading,   setLoading]  = useState(true);
  const [selected,  setSelected] = useState<Set<string>>(new Set());
  const [modal,     setModal]    = useState(false);
  const [editItem,  setEditItem] = useState<any>(null);
  const [generating,setGen]      = useState(false);
  const [search,    setSearch]   = useState('');
  const [toast,     setToast]    = useState({ msg:'', type:'success' as 'success'|'error' });
  const show = (msg:string, type:'success'|'error'='success') => { setToast({msg,type}); setTimeout(()=>setToast({msg:'',type:'success'}),3000); };

  const load=useCallback(async()=>{setLoading(true);try{const r=await client.get('/v1/hr/payroll/employee-salary-list');setEmps(r.data?.data??[]);}catch{}finally{setLoading(false);}},[]);
  useEffect(()=>{load();},[load]);

  const filtered = search ? employees.filter(u=>fullName(u).toLowerCase().includes(search.toLowerCase())||String(u.pf_number||'').includes(search)) : employees;
  const allSel   = filtered.length>0 && filtered.every(u=>selected.has(personKey(u)));
  const toggleAll= ()=>setSelected(s=>{const ns=new Set(s);allSel?filtered.forEach(u=>ns.delete(personKey(u))):filtered.forEach(u=>ns.add(personKey(u)));return ns;});
  const toggleOne= (key:string)=>setSelected(s=>{const ns=new Set(s);ns.has(key)?ns.delete(key):ns.add(key);return ns;});

  const handleGenerate=async()=>{
    const selectedEmps=employees.filter(u=>selected.has(personKey(u)))
      .map(u=>({ person_type: u.person_type, person_id: u.person_id, salary_amount: u.assigned_amount, full_name: u.full_name }));
    if(!selectedEmps.length){show('Select at least one employee','error');return;}
    if(!confirm(`Generate salary for ${selectedEmps.length} employee(s)?`)) return;
    setGen(true);
    try{const r=await client.post('/v1/hr/payroll/generate-payroll',{payload:selectedEmps});if(r.data?.status){show(r.data.message||'Salary generated');setSelected(new Set());load();}else show(r.data?.message||'Failed','error');}
    catch(ex:any){show(ex?.response?.data?.message||'Error','error');}finally{setGen(false);}
  };

  const handleDelete=async(u:any)=>{
    if(!confirm(`Remove salary for ${fullName(u)}?`)) return;
    try{const r=await client.delete(`/v1/hr/payroll/employee-salary-list?salary_assignment_id=${u.salary_assignment_id}`);if(r.data?.status){show('Deleted');load();}else show(r.data?.message||'Failed','error');}
    catch(ex:any){show(ex?.response?.data?.message||'Error','error');}
  };

  return (<>
    <Toast msg={toast.msg} type={toast.type}/>
    <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
      <div className="relative"><svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" className="h-9 pl-8 pr-3 w-52 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm placeholder-gray-400 focus:outline-none focus:border-brand-400"/></div>
      {selected.size>0&&(
        <button onClick={handleGenerate} disabled={generating} className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-semibold bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white transition-colors flex items-center justify-center gap-2">
          {generating&&<Spin size="sm"/>}Generate Salary ({selected.size})
        </button>
      )}
    </div>
    <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800/60">
          <tr>
            <th className="w-10 px-4 py-3"><input type="checkbox" checked={allSel} onChange={toggleAll} className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-400 cursor-pointer"/></th>
            {['PF','Employee','Scale','Salary Amount','Department','Joining Date',''].map(h=><th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
          {loading?<tr><td colSpan={8} className="px-4 py-12 text-center"><Spin/></td></tr>
          :filtered.length===0?<tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">No payroll records.</td></tr>
          :filtered.map(u=>(
            <tr key={personKey(u)} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
              <td className="px-4 py-3"><input type="checkbox" checked={selected.has(personKey(u))} onChange={()=>toggleOne(personKey(u))} className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-400 cursor-pointer"/></td>
              <td className="px-4 py-3 font-mono text-xs text-gray-500">{u.pf_number||'—'}</td>
              <td className="px-4 py-3"><div className="flex items-center gap-3"><EmpAvatar emp={u}/><div><p className="font-semibold text-gray-800 dark:text-white">{fullName(u)}</p><p className="text-xs text-gray-400">{u.designation_name}</p></div></div></td>
              <td className="px-4 py-3 text-gray-500 text-xs">{u.scale_name||'—'}</td>
              <td className="px-4 py-3 font-semibold text-green-600 dark:text-green-400">{fmtCur(u.assigned_amount)}</td>
              <td className="px-4 py-3 text-gray-500">{u.department_name||'—'}</td>
              <td className="px-4 py-3 text-xs text-gray-400">{u.joining_date?fmtDate(u.joining_date):'—'}</td>
              <td className="px-4 py-3">
                <RowMenu items={[
                  { label:'Edit Amount', onClick:()=>{setEditItem(u);setModal(true);} },
                  { label:'Delete', danger:true, onClick:()=>handleDelete(u) },
                ]}/>
              </td>
            </tr>
          ))}
        </tbody>
        {employees.length>0&&(
          <tfoot className="bg-gray-50 dark:bg-gray-800/40">
            <tr><td colSpan={8} className="px-4 py-3 text-right">
              <button onClick={handleGenerate} disabled={generating||selected.size===0} className="flex items-center gap-2 h-9 px-5 rounded-xl text-sm font-semibold bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white transition-colors ml-auto">
                {generating&&<Spin size="sm"/>}Generate Salary {selected.size>0?`(${selected.size} selected)`:''}
              </button>
            </td></tr>
          </tfoot>
        )}
      </table>
    </div>
    <Modal open={modal} onClose={()=>setModal(false)} title="Edit Salary Amount">
      {modal&&editItem&&<EditSalaryModal employee={editItem} onSubmitted={()=>{load();show('Updated');}} onClose={()=>setModal(false)}/>}
    </Modal>
  </>);
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 4 — SALARY SLIPS
// ══════════════════════════════════════════════════════════════════════════════
function printSlip(payroll: any, items: any[]) {
  const earnings   = items.filter(i => i.type === 'earning');
  const deductions = items.filter(i => i.type === 'deduction');
  const grossSalary = earnings.reduce((s, i) => s + Number(i.amount), 0);
  const totalDeductions = deductions.reduce((s, i) => s + Number(i.amount), 0);
  const netPay = grossSalary - totalDeductions; // Net Pay = Gross Salary − Total Deductions

  const rows = (arr: any[]) => arr.map(i => `
    <tr><td>${i.name}</td><td style="text-align:right">${fmtCur(i.amount)}</td></tr>`).join('');

  const maxRows = Math.max(earnings.length, deductions.length, 1);
  const earnPad = Array.from({ length: maxRows - earnings.length }).map(() => '<tr><td>&nbsp;</td><td></td></tr>').join('');
  const dedPad  = Array.from({ length: maxRows - deductions.length }).map(() => '<tr><td>&nbsp;</td><td></td></tr>').join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Salary Slip - ${fullName(payroll)}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,Helvetica,sans-serif;font-size:10.5pt;color:#111;background:#fff;position:relative}
    .watermark{position:fixed;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;z-index:-1;opacity:0.07;pointer-events:none}
    .watermark img{width:65%;max-width:420px}
    .sheet{border:2px dashed #999;margin:14px}
    .hdr{padding:10px 16px;border-bottom:1px dashed #999;display:flex;align-items:center;justify-content:center;gap:14px}
    .hdr img{width:52px;height:52px;object-fit:contain;flex-shrink:0}
    .hdr .hdr-text{text-align:center}
    .hdr h1{font-size:15pt;font-weight:900}
    .hdr h2{font-size:12pt;font-weight:700;margin-top:2px}
    .info{padding:14px 20px;display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;border-bottom:1px dashed #999;font-size:10pt}
    .info div{display:flex;justify-content:space-between}
    .info span:first-child{color:#555}
    .cols{display:grid;grid-template-columns:1fr 1fr}
    .col{padding:0}
    .col + .col{border-left:1px dashed #999}
    .colhead{text-align:center;font-weight:900;font-size:11pt;padding:8px;border-bottom:1px dashed #999}
    table{width:100%;border-collapse:collapse}
    td{padding:6px 16px;font-size:10pt}
    .totrow td{font-weight:900;border-top:1px dashed #999}
    .netpay{display:grid;grid-template-columns:1fr 1fr;border-top:1px dashed #999}
    .netpay > div{text-align:center;font-weight:900;font-size:12pt;padding:10px}
    .netpay > div:first-child{border-right:1px dashed #999}
    @page{size:A4;margin:10mm}
  </style></head><body>
  <div class="watermark"><img src="${window.location.origin}/images/logo/logo.png" /></div>
  <div class="sheet">
    <div class="hdr">
      <img src="${window.location.origin}/images/logo/logo-icon.svg" />
      <div class="hdr-text">
        <h1>URA Security System</h1>
        <h2>Salary Slip for ${fmtMonth(payroll.salary_month)}</h2>
      </div>
    </div>
    <div class="info">
      <div><span>Name</span><span><strong>${fullName(payroll)}</strong></span></div>
      <div><span>Department</span><span>${payroll.department_name || '—'}</span></div>
      <div><span>PF Number</span><span>${payroll.pf_number || '—'}</span></div>
      <div><span>Bank</span><span>${payroll.bank_name || '—'}</span></div>
      <div><span>Designation</span><span>${payroll.designation_name || '—'}</span></div>
      <div><span>A/c No.</span><span>${payroll.bank_acc || '—'}</span></div>
    </div>
    <div class="cols">
      <div class="col">
        <div class="colhead">Earnings</div>
        <table><tbody>${rows(earnings)}${earnPad}
          <tr class="totrow"><td>Gross Salary</td><td style="text-align:right">${fmtCur(grossSalary)}</td></tr>
        </tbody></table>
      </div>
      <div class="col">
        <div class="colhead">Deductions</div>
        <table><tbody>${rows(deductions)}${dedPad}
          <tr class="totrow"><td>Total Deductions</td><td style="text-align:right">${fmtCur(totalDeductions)}</td></tr>
        </tbody></table>
      </div>
    </div>
    <div class="netpay"><div>Net Pay</div><div>${fmtCur(netPay)}</div></div>
  </div>
  </body></html>`;

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.onload = () => { w.focus(); w.print(); };
}

function SlipModal({ payroll, onClose }:{ payroll:any; onClose:()=>void }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get(`/v1/hr/payroll/line-items/${payroll.payroll_id}`).then(r => setItems(r.data?.data ?? [])).finally(() => setLoading(false));
  }, [payroll.payroll_id]);

  const earnings   = items.filter(i => i.type === 'earning');
  const deductions = items.filter(i => i.type === 'deduction');
  const grossSalary = earnings.reduce((s, i) => s + Number(i.amount), 0);
  const totalDeductions = deductions.reduce((s, i) => s + Number(i.amount), 0);
  const netPay = grossSalary - totalDeductions; // Net Pay = Gross Salary − Total Deductions

  return (
    <div className="space-y-4">
      {/* "Paper" preview — mirrors the actual print output exactly */}
      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
        <div className="flex items-center justify-center gap-3 py-3 px-5 border-b border-dashed border-gray-300 dark:border-gray-600">
          <img src="/images/logo/logo-icon.svg" alt="URA" className="w-11 h-11 object-contain flex-shrink-0"/>
          <div className="text-center">
            <p className="text-sm font-black uppercase tracking-wide text-gray-900 dark:text-white">URA Security System</p>
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mt-0.5">Salary Slip for {fmtMonth(payroll.salary_month)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 px-5 py-3 text-xs border-b border-dashed border-gray-300 dark:border-gray-600">
          <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Name</span><span className="font-bold text-gray-800 dark:text-white">{fullName(payroll)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Department</span><span className="text-gray-800 dark:text-white">{payroll.department_name||'—'}</span></div>
          <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">PF Number</span><span className="text-gray-800 dark:text-white">{payroll.pf_number||'—'}</span></div>
          <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Bank</span><span className="text-gray-800 dark:text-white">{payroll.bank_name||'—'}</span></div>
          <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Designation</span><span className="text-gray-800 dark:text-white">{payroll.designation_name||'—'}</span></div>
          <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">A/c No.</span><span className="text-gray-800 dark:text-white">{payroll.bank_acc||'—'}</span></div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 gap-2 text-gray-400"><Spin/>Loading…</div>
        ) : (
          <>
            <div className="grid grid-cols-2">
              <div className="border-r border-dashed border-gray-300 dark:border-gray-600">
                <p className="text-center text-xs font-black py-2 border-b border-dashed border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white">Earnings</p>
                <table className="w-full text-xs">
                  <tbody>
                    {earnings.map(i => (
                      <tr key={i.id}><td className="py-1.5 px-4 text-gray-600 dark:text-gray-300">{i.name}</td><td className="py-1.5 px-4 text-right text-gray-800 dark:text-white">{fmtCur(i.amount)}</td></tr>
                    ))}
                    <tr className="border-t border-dashed border-gray-300 dark:border-gray-600"><td className="py-1.5 px-4 font-black text-gray-900 dark:text-white">Gross Salary</td><td className="py-1.5 px-4 text-right font-black text-gray-900 dark:text-white">{fmtCur(grossSalary)}</td></tr>
                  </tbody>
                </table>
              </div>
              <div>
                <p className="text-center text-xs font-black py-2 border-b border-dashed border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white">Deductions</p>
                <table className="w-full text-xs">
                  <tbody>
                    {deductions.map(i => (
                      <tr key={i.id}><td className="py-1.5 px-4 text-gray-600 dark:text-gray-300">{i.name}</td><td className="py-1.5 px-4 text-right text-gray-800 dark:text-white">{fmtCur(i.amount)}</td></tr>
                    ))}
                    <tr className="border-t border-dashed border-gray-300 dark:border-gray-600"><td className="py-1.5 px-4 font-black text-gray-900 dark:text-white">Total Deductions</td><td className="py-1.5 px-4 text-right font-black text-gray-900 dark:text-white">{fmtCur(totalDeductions)}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-2 border-t border-dashed border-gray-300 dark:border-gray-600">
              <div className="text-center py-2.5 border-r border-dashed border-gray-300 dark:border-gray-600">
                <p className="font-black text-sm text-gray-900 dark:text-white">Net Pay</p>
              </div>
              <div className="text-center py-2.5">
                <p className="font-black text-sm text-gray-900 dark:text-white">{fmtCur(netPay)}</p>
              </div>
            </div>
          </>
        )}
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 hover:bg-gray-50 transition-colors">Close</button>
        <button onClick={()=>printSlip(payroll, items)} disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white transition-colors flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
          Print Slip
        </button>
      </div>
    </div>
  );
}

function SalarySlipsTab() {
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [search,   setSearch]   = useState('');

  useEffect(()=>{ setLoading(true); client.get('/v1/hr/payroll/generated-payrolls').then(r=>setPayrolls(r.data?.data??[])).catch(()=>{}).finally(()=>setLoading(false)); },[]);

  const filtered = search ? payrolls.filter(p=>fullName(p).toLowerCase().includes(search.toLowerCase())||String(p.pf_number||'').includes(search)) : payrolls;

  return (<>
    <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
      <p className="text-sm text-gray-500 dark:text-gray-400">{payrolls.length} payslip{payrolls.length!==1?'s':''}</p>
      <div className="relative"><svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" className="h-9 pl-8 pr-3 w-52 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm placeholder-gray-400 focus:outline-none focus:border-brand-400"/></div>
    </div>
    <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800/60"><tr>{['PF Number','Employee','Title','Scale','Basic Salary','Net Salary','Department','Month',''].map(h=><th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
          {loading?<tr><td colSpan={9} className="px-4 py-12 text-center"><Spin/></td></tr>
          :filtered.length===0?<tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">No payrolls generated yet.</td></tr>
          :filtered.map(p=>(
            <tr key={personKey(p)} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
              <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.pf_number||'—'}</td>
              <td className="px-4 py-3"><div className="flex items-center gap-3"><EmpAvatar emp={p}/><div><p className="font-semibold text-gray-800 dark:text-white">{fullName(p)}</p><p className="text-xs text-gray-400">{p.designation_name}</p></div></div></td>
              <td className="px-4 py-3 text-gray-500 text-xs">{p.title_name||'—'}</td>
              <td className="px-4 py-3 text-gray-500 text-xs">{p.scale_name||'—'}</td>
              <td className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">{fmtCur(p.gross_salary)}</td>
              <td className="px-4 py-3 font-bold text-green-600 dark:text-green-400">{fmtCur(p.net_salary)}</td>
              <td className="px-4 py-3 text-gray-500 text-xs">{p.department_name||'—'}</td>
              <td className="px-4 py-3 text-xs text-gray-400">{fmtMonth(p.salary_month)}</td>
              <td className="px-4 py-3">
                <RowMenu items={[{ label:'Preview Slip', onClick:()=>{setSelected(p);setModal(true);} }]}/>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <Modal open={modal} onClose={()=>setModal(false)} title="Preview Salary Slip" size="lg">
      {modal&&selected&&<SlipModal payroll={selected} onClose={()=>setModal(false)}/>}
    </Modal>
  </>);
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 5 — PAYSLIP REPORT (generate salary sheet to bank — downloads .xlsx)
// ══════════════════════════════════════════════════════════════════════════════
function PayslipReportTab() {
  const [banks,       setBanks]       = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [form,        setForm]        = useState({ bank_id: '', department_id: '', salary_month: '' });
  const [errors,      setErrors]      = useState<Record<string,string>>({});
  const [generating,  setGenerating]  = useState(false);
  const [toast,       setToast]       = useState({ msg: '', type: 'success' as 'success'|'error' });
  const show = (msg: string, type: 'success'|'error' = 'success') => { setToast({msg,type}); setTimeout(()=>setToast({msg:'',type:'success'}),4000); };

  useEffect(() => {
    client.get('/v1/hr/masters/banks').then(r => setBanks(r.data?.data ?? [])).catch(() => {});
    client.get('/v1/hr/masters/departments').then(r => setDepartments(r.data?.data ?? r.data?.results ?? [])).catch(() => {});
  }, []);

  const set = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    if (v) setErrors(e => ({ ...e, [k]: '' }));
  };

  const validate = () => {
    const e: Record<string,string> = {};
    if (!form.salary_month) e.salary_month = 'Month and year is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    if (!confirm('Generate salary sheet to bank?')) return;
    setGenerating(true);
    try {
      // POST returns a blob (xlsx file)
      const r = await client.post('/v1/hr/payroll/generate-payroll-sheet', { payload: form }, {
        responseType: 'blob',
      });
      // Format month for filename e.g. "October 2024"
      const dt = new Date(form.salary_month);
      const monthLabel = dt.toLocaleString('en', { month: 'long', year: 'numeric' });
      const url  = window.URL.createObjectURL(new Blob([r.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Payroll Sheet for the Month of ${monthLabel}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      show('Salary sheet downloaded successfully');
    } catch (ex: any) {
      show(ex?.response?.data?.message || ex?.request?.statusText || 'Failed to generate salary sheet', 'error');
    } finally {
      setGenerating(false);
    }
  };

  return (<>
    <Toast msg={toast.msg} type={toast.type}/>
    <div className="max-w-2xl">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="mb-5">
          <h3 className="text-sm font-bold text-gray-800 dark:text-white">Generate Salary Sheet to Bank</h3>
          <p className="text-xs text-gray-400 mt-1">Select bank, department and month then download the Excel salary sheet.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <F label="Bank Name">
              <select value={form.bank_id} onChange={e => set('bank_id', e.target.value)} className={selCls}>
                <option value="">All Banks</option>
                {banks.map((b: any) => <option key={b.bank_id ?? b.id} value={String(b.bank_id ?? b.id)}>{b.bank_name ?? b.name}</option>)}
              </select>
            </F>
            <F label="Department">
              <select value={form.department_id} onChange={e => set('department_id', e.target.value)} className={selCls}>
                <option value="">All Departments</option>
                {departments.map((d: any) => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
              </select>
            </F>
          </div>
          <F label="Month and Year" required error={errors.salary_month}>
            <input
              type="month"
              value={form.salary_month ? form.salary_month.substring(0, 7) : ''}
              onChange={e => set('salary_month', e.target.value ? `${e.target.value}-01` : '')}
              className={inCls}
              placeholder="Select month and year"
            />
          </F>
          <div className="pt-2">
            <button type="submit" disabled={generating || !form.salary_month}
              className="flex items-center gap-2 h-10 px-6 rounded-xl text-sm font-semibold bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white transition-colors">
              {generating
                ? <><Spin size="sm"/> Generating…</>
                : <><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>Generate Salary Sheet to Bank</>}
            </button>
          </div>
        </form>
      </div>

      {/* Info card */}
      <div className="mt-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <div>
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">How it works</p>
            <ul className="text-xs text-blue-600/80 dark:text-blue-400/80 space-y-0.5">
              <li>• Bank and Department filters are optional — leave blank to include all</li>
              <li>• Month and Year is required — selects which payroll period to export</li>
              <li>• Downloads an <strong>.xlsx</strong> file ready for bank upload</li>
              <li>• Ensure salaries have been generated first (Payroll List tab)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </>);
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
const TAB_META: { id:Tab; label:string; icon:string }[] = [
  { id:'scales', label:'Salary Scales',       icon:'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { id:'assign', label:'Assign Salary Scale', icon:'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' },
  { id:'components', label:'Allowances & Deductions', icon:'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id:'list',   label:'Payroll List',         icon:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { id:'slips',  label:'Salary Slips',         icon:'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
  { id:'report', label:'Payslip Report',       icon:'M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
];

export default function PayrollPage({ tab: initTab = 'scales' }: { tab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initTab);
  useEffect(()=>{ setTab(initTab); },[initTab]);

  return (
    <div className="px-4 md:px-6 py-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Payroll Management</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Manage salary scales, assign salaries, generate payroll and view salary slips</p>
      </div>
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 mb-6 overflow-x-auto">
        {TAB_META.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${tab===t.id?'border-brand-500 text-brand-600 dark:text-brand-400':'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={t.icon}/></svg>
            {t.label}
          </button>
        ))}
      </div>
      {/* Content */}
      {tab==='scales' && <SalaryScalesTab/>}
      {tab==='assign' && <AssignSalaryTab/>}
      {tab==='components' && <PayrollComponentsTab/>}
      {tab==='list'   && <PayrollListTab/>}
      {tab==='slips'  && <SalarySlipsTab/>}
      {tab==='report' && <PayslipReportTab/>}
    </div>
  );
}
