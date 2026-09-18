import { useState, useEffect, useCallback } from 'react';
import DataTable, { type Column } from '../../../components/tables/DataTable';
import PageHeader from '../../../components/ui/PageHeader';
import StatusBadge from '../../../components/ui/StatusBadge';
import Modal from '../../../components/ui/Modal';
import { FormInput, FormSelect, FormActions } from '../../../components/forms/FormField';
import { catalogItemsApi, type CatalogItem } from '../api/operations.api';
import { fmtMoney } from '../components/LineItemsEditor';
import { getErrorMessage } from '../../../api/client';

function ErrorBanner({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
      {msg}
    </div>
  );
}

const EMPTY_FORM = { name: '', description: '', default_rate: '0', unit: 'unit', kind: 'invoice' as 'invoice' | 'expense' };

export default function CatalogItemsPage() {
  const [items,    setItems]    = useState<CatalogItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [kindFilter, setKindFilter] = useState('');
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing,   setEditing]   = useState<CatalogItem | null>(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving,    setSaving]    = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await catalogItemsApi.list({ kind: (kindFilter || undefined) as 'invoice' | 'expense' | undefined });
      setItems(data);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [kindFilter]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setFormError(''); setModalOpen(true); };
  const openEdit = (item: CatalogItem) => {
    setEditing(item);
    setForm({ name: item.name, description: item.description ?? '', default_rate: String(item.default_rate), unit: item.unit, kind: item.kind });
    setFormError('');
    setModalOpen(true);
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form.name.trim()) { setFormError('Name is required'); return; }
    setSaving(true); setFormError('');
    try {
      const payload = { name: form.name, description: form.description || null, default_rate: Number(form.default_rate) || 0, unit: form.unit, kind: form.kind };
      if (editing) await catalogItemsApi.update(editing.item_id, payload);
      else await catalogItemsApi.create(payload);
      setModalOpen(false);
      load();
    } catch (err) { setFormError(getErrorMessage(err, 'Failed to save catalog item')); }
    finally { setSaving(false); }
  };

  const deactivate = async (item: CatalogItem) => {
    if (!confirm(`Deactivate "${item.name}"? It will no longer appear when adding invoice/expense line items.`)) return;
    try { await catalogItemsApi.deactivate(item.item_id); load(); }
    catch (err) { setError(getErrorMessage(err, 'Failed to deactivate item')); }
  };

  const columns: Column<CatalogItem>[] = [
    { key: 'name',         header: 'Name', render: (r) => <span className="font-semibold text-gray-800 dark:text-white">{r.name}</span> },
    { key: 'kind',         header: 'Used In', render: (r) => <span className="capitalize text-gray-600 dark:text-gray-400">{r.kind}</span> },
    { key: 'default_rate', header: 'Default Rate', render: (r) => <span className="text-gray-800 dark:text-white">{fmtMoney(r.default_rate)}</span> },
    { key: 'unit',         header: 'Unit' },
    { key: 'status',       header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: '', render: (r) => (
        <div className="flex items-center gap-1.5">
          <button onClick={() => openEdit(r)} className="h-8 px-2.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Edit</button>
          {r.status === 'active' && (
            <button onClick={() => deactivate(r)} className="h-8 px-2.5 rounded-lg text-xs font-medium border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">Deactivate</button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader title="Catalog Items" description="Reusable line items — pick these when adding invoice or expense items, or type free text instead."
        action={
          <div className="flex items-center gap-2">
            <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-white border-gray-300 dark:border-gray-700">
              <option value="">All</option>
              <option value="invoice">Invoice items</option>
              <option value="expense">Expense items</option>
            </select>
            <button onClick={openCreate} className="px-5 py-2 text-sm font-semibold bg-brand-500 text-white rounded-lg hover:bg-brand-600 whitespace-nowrap">
              + New Item
            </button>
          </div>
        }
      />
      <ErrorBanner msg={error} />
      <DataTable columns={columns} data={items} loading={loading} keyField="item_id" emptyText="No catalog items yet." />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Catalog Item' : 'New Catalog Item'}>
        <form onSubmit={submit} className="space-y-4">
          {formError && <div className="rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-3 py-2 text-xs text-red-600 dark:text-red-400">{formError}</div>}
          <FormInput label="Name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <FormInput label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Default Rate" type="number" step="0.01" min="0" value={form.default_rate} onChange={(e) => setForm((f) => ({ ...f, default_rate: e.target.value }))} />
            <FormInput label="Unit" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} placeholder="unit, hour, kg…" />
          </div>
          <FormSelect label="Used In" value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as 'invoice' | 'expense' }))}
            options={[{ value: 'invoice', label: 'Invoices' }, { value: 'expense', label: 'Expenses' }]} />
          <FormActions onCancel={() => setModalOpen(false)} submitLabel={editing ? 'Update Item' : 'Create Item'} loading={saving} />
        </form>
      </Modal>
    </div>
  );
}
