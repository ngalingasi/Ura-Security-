import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { FormInput, FormSelect, FormSection, FormActions } from '../../../components/forms/FormField';
import DatePicker from '../../../components/forms/DatePicker';
import LineItemsEditor from '../components/LineItemsEditor';
import { expensesApi, type LineItem } from '../api/operations.api';
import { clientsApi, type Client } from '../../clients/api/clients.api';
import { getErrorMessage } from '../../../api/client';
import { ROUTES } from '../../../routes/routes';

function ErrorBanner({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
      {msg}
    </div>
  );
}

export default function ExpenseFormPage() {
  const navigate = useNavigate();
  const { expenseId } = useParams<{ expenseId: string }>();
  const isEdit = !!expenseId;

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(isEdit);

  const [clientId, setClientId] = useState('');
  const [date,     setDate]     = useState(new Date().toISOString().slice(0, 10));
  const [notes,    setNotes]    = useState('');
  const [items,    setItems]    = useState<LineItem[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    clientsApi.list({ status: 'active', limit: 100 }).then(({ data }) => setClients(data.results)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    expensesApi.getById(Number(expenseId)).then(({ data: exp }) => {
      setClientId(exp.client_id ? String(exp.client_id) : '');
      setDate(exp.expense_date?.slice(0, 10) ?? '');
      setNotes(exp.notes ?? '');
      setItems((exp.items ?? []).map((it) => ({ description: it.description, unit: it.unit, quantity: Number(it.quantity), unit_price: Number(it.unit_price) })));
    }).catch((err) => setError(getErrorMessage(err))).finally(() => setLoading(false));
  }, [isEdit, expenseId]);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError('');
    const validItems = items.filter((i) => i.description && Number(i.quantity) > 0);
    if (validItems.length === 0) { setError('Add at least one item'); return; }

    setSubmitting(true);
    try {
      const payload = {
        client_id: clientId ? Number(clientId) : null, expense_date: date, notes,
        line_items: validItems.map((i) => ({ description: i.description, unit: i.unit, quantity: i.quantity, unit_price: i.unit_price })),
      };
      const { data } = isEdit
        ? await expensesApi.update(Number(expenseId), payload)
        : await expensesApi.create(payload);
      navigate(ROUTES.EXPENSE_DETAIL.replace(':expenseId', String(data.expense_id)));
    } catch (err) {
      setError(getErrorMessage(err, `Failed to ${isEdit ? 'update' : 'create'} expense`));
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="p-6 text-center text-gray-400">Loading…</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate(-1)} className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-1.5">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">{isEdit ? 'Edit Expense' : 'New Expense'}</h1>
      </div>

      <form onSubmit={submit} className="space-y-6">
        <ErrorBanner msg={error} />

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 space-y-4">
          <FormSection title="Expense Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormSelect label="Client (optional)" value={clientId} onChange={(e) => setClientId(e.target.value)}
                placeholder="No client — internal expense"
                options={clients.map((c) => ({ value: c.client_id, label: c.name }))} />
              <DatePicker label="Expense Date" required value={date} onChange={setDate} />
            </div>
            <FormInput label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
          </FormSection>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 space-y-4">
          <FormSection title="Line Items">
            <LineItemsEditor items={items} onChange={setItems} />
          </FormSection>
        </div>

        <FormActions onCancel={() => navigate(-1)} submitLabel={isEdit ? 'Update Expense' : 'Save Expense'} loading={submitting} />
      </form>
    </div>
  );
}
