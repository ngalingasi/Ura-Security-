/**
 * Department List  —  /hr/departments
 *
 * Reworked from the ported version: the TPA department mapping is gone
 * (TPA sync no longer applies now that there's no separate hr_employees
 * table pushing to it). "usercount" now counts everyone with an HR
 * employment profile in this department (URA users + security guards
 * combined), not a TPA-linked labourer count.
 *
 * APIs:
 *   GET  /v1/hr/masters/departments           → list  {data:[{id,name,region,usercount,createdby}]}
 *   POST /v1/hr/masters/departments {payload} → create/update  {id?,name,region}
 */
import { useEffect, useState, useCallback } from 'react';
import client from '../../../api/client';
import PageShell from '../components/ui/PageShell';

// ── Shared ────────────────────────────────────────────────────────────────────
const inCls  = 'w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-white focus:outline-none focus:border-brand-400 placeholder-gray-400';
const selCls = 'w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:border-brand-400 appearance-none';
const lblCls = 'block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5';

function F({ label, required, error, children }: { label:string; required?:boolean; error?:string; children:React.ReactNode }) {
  return <div><label className={lblCls}>{label}{required&&<span className="text-red-500 ml-0.5">*</span>}</label>{children}{error&&<p className="text-xs text-red-500 mt-1">{error}</p>}</div>;
}

function Modal({ open, onClose, title, children }: { open:boolean; onClose:()=>void; title:string; children:React.ReactNode }) {
  useEffect(()=>{ document.body.style.overflow=open?'hidden':''; return()=>{ document.body.style.overflow=''; }; },[open]);
  if(!open) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-8 px-4 pb-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50"/>
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 max-h-[90vh] flex flex-col" onClick={e=>e.stopPropagation()}>
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

// ── Department form ───────────────────────────────────────────────────────────
function DeptForm({ editItem, onClose, onSuccess }: { editItem?:any; onClose:()=>void; onSuccess:()=>void }) {
  const isEdit = !!editItem?.id;
  const [form, setForm] = useState({
    id:     editItem?.id     || '',
    name:   editItem?.name   || '',
    region: editItem?.region || '',
  });
  const [errors, setErrors] = useState<Record<string,string>>({});
  const [sub, setSub] = useState(false); const [err, setErr] = useState('');

  const set = (k:string, v:any) => { setForm(f=>({...f,[k]:v})); if(v) setErrors(e=>({...e,[k]:''})); };

  const validate = () => {
    const e:Record<string,string>={};
    if(!form.name.trim())   e.name   = 'Department name is required';
    if(!form.region.trim()) e.region = 'Region is required';
    setErrors(e); return Object.keys(e).length===0;
  };

  const submit = async (ev:React.FormEvent) => {
    ev.preventDefault(); if(!validate()) return;
    setSub(true); setErr('');
    try {
      const r = await client.post('/v1/hr/masters/departments', { payload: form });
      if (r.data?.status) { onSuccess(); onClose(); }
      else setErr(r.data?.message || 'Failed to save');
    } catch(ex:any){ setErr(ex?.response?.data?.message||'Error'); }
    finally { setSub(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {err && <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 text-xs text-red-600">{err}</div>}
      <div className="grid grid-cols-2 gap-4">
        <F label="Region" required error={errors.region}>
          <input value={form.region} onChange={e=>set('region',e.target.value)} placeholder="e.g. Dar es Salaam" className={inCls}/>
        </F>
        <F label="Department Name" required error={errors.name}>
          <input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Operations" className={inCls}/>
        </F>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
        <button type="submit" disabled={sub} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white transition-colors">{sub?'Saving…':isEdit?'Update Department':'Save Department'}</button>
      </div>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DepartmentsPage() {
  const [data,      setData]     = useState<any[]>([]);
  const [loading,   setLoading]  = useState(true);
  const [search,    setSearch]   = useState('');
  const [page,      setPage]     = useState(1);
  const [selected,  setSelected] = useState<Set<number>>(new Set());
  const PER_PAGE = 10;
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem,  setEditItem]  = useState<any>(null);
  const [toast, setToast] = useState({ msg:'', type:'success' as 'success'|'error' });
  const showToast = (msg:string, type:'success'|'error'='success') => { setToast({msg,type}); setTimeout(()=>setToast({msg:'',type:'success'}),3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await client.get('/v1/hr/masters/departments');
      setData(r.data?.data ?? r.data?.results ?? r.data ?? []);
    } catch{ setData([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ load(); },[load]);

  const filtered = search
    ? data.filter(d=>`${d.name||''} ${d.region||''}`.toLowerCase().includes(search.toLowerCase()))
    : data;
  const total = filtered.length, pages = Math.ceil(total/PER_PAGE), start=(page-1)*PER_PAGE;
  const paged = filtered.slice(start, start+PER_PAGE);

  const allSel = paged.length>0 && paged.every(d=>selected.has(d.id));
  const toggleAll = () => setSelected(s=>{ const ns=new Set(s); allSel?paged.forEach(d=>ns.delete(d.id)):paged.forEach(d=>ns.add(d.id)); return ns; });
  const toggleOne = (id:number) => setSelected(s=>{ const ns=new Set(s); ns.has(id)?ns.delete(id):ns.add(id); return ns; });

  return (
    <>
      {toast.msg && <div className={`fixed top-4 right-4 z-[99999] px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg ${toast.type==='success'?'bg-brand-600':'bg-red-600'} text-white`}>{toast.msg}</div>}

      <PageShell title="Department Lists" subtitle={`${total} department${total!==1?'s':''}`}
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search departments…" className="h-9 pl-8 pr-3 w-52 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm placeholder-gray-400 focus:outline-none focus:border-brand-400"/>
            </div>
            <button onClick={()=>{ setEditItem(null); setModalOpen(true); }}
              className="h-9 px-4 rounded-xl text-sm font-semibold bg-brand-500 hover:bg-brand-600 text-white transition-colors flex items-center gap-2">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Department
            </button>
          </div>
        }
      >
        <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60">
              <tr>
                <th className="w-10 px-4 py-3"><input type="checkbox" checked={allSel} onChange={toggleAll} className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-brand-500 focus:ring-brand-400 cursor-pointer"/></th>
                {['SN','Department Name','Region','People','Added By',''].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-16 text-center"><div className="flex items-center justify-center gap-2 text-gray-400"><div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"/>Loading…</div></td></tr>
              ) : paged.length===0 ? (
                <tr><td colSpan={7} className="px-4 py-16 text-center text-gray-400">{search?'No departments match your search.':'No departments found.'}</td></tr>
              ) : paged.map((item, idx)=>(
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3"><input type="checkbox" checked={selected.has(item.id)} onChange={()=>toggleOne(item.id)} className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-brand-500 focus:ring-brand-400 cursor-pointer"/></td>
                  {/* SN */}
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{start+idx+1}</td>
                  {/* Department name */}
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-800 dark:text-white">{item.name}</p>
                  </td>
                  {/* Region */}
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.region||'—'}</td>
                  {/* Labourer(s) */}
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                      {item.usercount ?? 0}
                    </span>
                  </td>
                  {/* Added By */}
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.createdby||'—'}</td>
                  {/* Edit */}
                  <td className="px-4 py-3">
                    <button onClick={()=>{ setEditItem(item); setModalOpen(true); }}
                      className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-brand-300 hover:text-brand-600 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pages>1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{start+1}–{Math.min(start+PER_PAGE,total)} of {total}</p>
            <div className="flex gap-1">
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Prev</button>
              {Array.from({length:Math.min(5,pages)},(_,i)=>{const n=Math.max(1,Math.min(pages-4,page-2))+i;return<button key={n} onClick={()=>setPage(n)} className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${n===page?'bg-brand-500 text-white':'border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>{n}</button>;})}
              <button onClick={()=>setPage(p=>Math.min(pages,p+1))} disabled={page===pages} className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Next</button>
            </div>
          </div>
        )}
      </PageShell>

      <Modal open={modalOpen} onClose={()=>{ setModalOpen(false); setEditItem(null); }} title={editItem?`Edit Department — ${editItem.name}`:'Add New Department'}>
        {modalOpen && <DeptForm editItem={editItem}
          onClose={()=>{ setModalOpen(false); setEditItem(null); }}
          onSuccess={()=>{ load(); showToast(editItem?'Department updated':'Department added'); }}
        />}
      </Modal>
    </>
  );
}
