import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { FormInput, FormSelect, FormSection, FormActions } from '../../../components/forms/FormField';
import DatePicker from '../../../components/forms/DatePicker';
import LineItemsEditor, { fmtMoney } from '../components/LineItemsEditor';
import { invoicesApi, type LineItem } from '../api/operations.api';
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

export default function InvoiceFormPage() {
  const navigate = useNavigate();
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const isEdit = !!invoiceId;

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [locked,  setLocked]  = useState(false);

  const [clientId,   setClientId]   = useState('');
  const [issuedDate, setIssuedDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate,    setDueDate]    = useState('');
  const [notes,      setNotes]      = useState('');
  const [whtEnabled, setWhtEnabled] = useState(true);
  const [whtRate,    setWhtRate]    = useState(5);
  const [vatEnabled, setVatEnabled] = useState(true);
  const [vatRate,    setVatRate]    = useState(18);
  const [items, setItems] = useState<LineItem[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    clientsApi.list({ status: 'active', limit: 100 }).then(({ data }) => setClients(data.results)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    invoicesApi.getById(Number(invoiceId)).then(({ data: inv }) => {
      if (inv.status !== 'invoiced') { setLocked(true); return; }
      setClientId(String(inv.client_id));
      setIssuedDate(inv.issued_date?.slice(0, 10) ?? '');
      setDueDate(inv.due_date?.slice(0, 10) ?? '');
      setNotes(inv.notes ?? '');
      setWhtEnabled(!!inv.wht_enabled);
      setWhtRate(Number(inv.wht_rate));
      setVatEnabled(!!inv.vat_enabled);
      setVatRate(Number(inv.vat_rate));
      setItems((inv.items ?? []).map((it) => ({ description: it.description, unit: it.unit, quantity: Number(it.quantity), unit_price: Number(it.unit_price) })));
    }).catch((err) => setError(getErrorMessage(err))).finally(() => setLoading(false));
  }, [isEdit, invoiceId]);

  const subtotal = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0);
  const whtAmount = whtEnabled ? subtotal * (whtRate / 100) : 0;
  const vatAmount = vatEnabled ? subtotal * (vatRate / 100) : 0;
  const totalAmount = subtotal + vatAmount - whtAmount;

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError('');
    if (!clientId) { setError('Client is required'); return; }
    const validItems = items.filter((i) => i.description && Number(i.quantity) > 0);
    if (validItems.length === 0) { setError('Add at least one item'); return; }

    setSubmitting(true);
    try {
      const payload = {
        client_id: Number(clientId), issued_date: issuedDate, due_date: dueDate || null, notes,
        wht_enabled: whtEnabled, wht_rate: whtRate,
        vat_enabled: vatEnabled, vat_rate: vatRate,
        line_items: validItems.map((i) => ({ description: i.description, unit: i.unit, quantity: i.quantity, unit_price: i.unit_price })),
      };
      const { data } = isEdit
        ? await invoicesApi.update(Number(invoiceId), payload)
        : await invoicesApi.create(payload);
      navigate(ROUTES.INVOICE_DETAIL.replace(':invoiceId', String(data.invoice_id)));
    } catch (err) {
      setError(getErrorMessage(err, `Failed to ${isEdit ? 'update' : 'create'} invoice`));
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="p-6 text-center text-gray-400">Loading…</div>;

  if (locked) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <p className="text-gray-500 dark:text-gray-400 mb-4">This invoice is no longer editable — only invoices still in "invoiced" status can be edited.</p>
        <button onClick={() => navigate(-1)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">← Go Back</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate(-1)} className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-1.5">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">{isEdit ? 'Edit Invoice' : 'New Invoice'}</h1>
      </div>

      <form onSubmit={submit} className="space-y-6">
        <ErrorBanner msg={error} />

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 space-y-4">
          <FormSection title="Invoice Details">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormSelect label="Client" required value={clientId} onChange={(e) => setClientId(e.target.value)}
                disabled={isEdit} placeholder="Select client…"
                options={clients.map((c) => ({ value: c.client_id, label: c.name }))}
                hint={isEdit ? "Client can't be changed after creation." : undefined} />
              <DatePicker label="Issued Date" required value={issuedDate} onChange={setIssuedDate} />
              <DatePicker label="Due Date" value={dueDate} onChange={setDueDate} />
            </div>
            <FormInput label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Bank details, payment instructions, etc." />
          </FormSection>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 space-y-4">
          <FormSection title="Line Items">
            <LineItemsEditor items={items} onChange={setItems} />
          </FormSection>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
          <FormSection title="Taxes">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={whtEnabled} onChange={(e) => setWhtEnabled(e.target.checked)} className="rounded" />
                  Apply Withholding Tax (WHT)
                </label>
                {whtEnabled && (
                  <div className="flex items-center gap-2 pl-6">
                    <input type="number" step="0.01" value={whtRate} onChange={(e) => setWhtRate(Number(e.target.value))}
                      className="w-24 rounded-lg border px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-white border-gray-300 dark:border-gray-700" />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={vatEnabled} onChange={(e) => setVatEnabled(e.target.checked)} className="rounded" />
                  Apply VAT
                </label>
                {vatEnabled && (
                  <div className="flex items-center gap-2 pl-6">
                    <input type="number" step="0.01" value={vatRate} onChange={(e) => setVatRate(Number(e.target.value))}
                      className="w-24 rounded-lg border px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-white border-gray-300 dark:border-gray-700" />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                )}
              </div>
            </div>
          </FormSection>
          <div className="text-sm space-y-1 text-right mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <p className="text-gray-500">Subtotal: <span className="text-gray-800 dark:text-white font-medium">{fmtMoney(subtotal)}</span></p>
            {vatEnabled && <p className="text-gray-500">+ VAT ({vatRate}%): <span className="text-gray-800 dark:text-white font-medium">{fmtMoney(vatAmount)}</span></p>}
            {whtEnabled && <p className="text-gray-500">− WHT ({whtRate}%): <span className="text-gray-800 dark:text-white font-medium">{fmtMoney(whtAmount)}</span></p>}
            <p className="text-base font-bold text-gray-800 dark:text-white pt-1">Total: {fmtMoney(totalAmount)}</p>
          </div>
        </div>

        <FormActions onCancel={() => navigate(-1)} submitLabel={isEdit ? 'Update Invoice' : 'Create Invoice'} loading={submitting} />
      </form>
    </div>
  );
}
