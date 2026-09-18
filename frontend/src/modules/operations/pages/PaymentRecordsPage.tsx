import { useState, useEffect, useCallback } from 'react';
import DataTable, { type Column } from '../../../components/tables/DataTable';
import PageHeader from '../../../components/ui/PageHeader';
import { paymentsApi, type PaymentRecord } from '../api/operations.api';
import { fmtMoney } from '../components/LineItemsEditor';
import { formatDate } from '../../../utils/date';
import { getErrorMessage } from '../../../api/client';

function ErrorBanner({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
      {msg}
    </div>
  );
}

export default function PaymentRecordsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await paymentsApi.list(); setPayments(data); }
    catch (err) { setError(getErrorMessage(err)); setPayments([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalAmount = payments.reduce((s, p) => s + Number(p.amount || 0), 0);

  const columns: Column<PaymentRecord>[] = [
    { key: 'invoice_number', header: 'Invoice', render: (r) => <span className="font-mono text-xs text-gray-500">{r.invoice_number}</span> },
    { key: 'client_name',    header: 'Client', render: (r) => <span className="font-semibold text-gray-800 dark:text-white">{r.client_name}</span> },
    { key: 'amount',         header: 'Amount', render: (r) => <span className="font-medium text-gray-800 dark:text-white">{fmtMoney(r.amount)}</span> },
    { key: 'paid_at',        header: 'Paid At', render: (r) => formatDate(r.paid_at) },
    {
      key: 'evidence', header: 'Evidence', render: (r) => r.evidence_name
        ? <span className="text-xs text-gray-500 dark:text-gray-400">{r.evidence_name}</span>
        : <span className="text-gray-400 text-xs">—</span>,
    },
  ];

  return (
    <div className="p-6">
      <PageHeader title="Payment Records" description={`${payments.length} payment${payments.length !== 1 ? 's' : ''} recorded`} />
      <ErrorBanner msg={error} />

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Total Payments</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{payments.length}</p>
        </div>
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Total Collected</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{fmtMoney(totalAmount)}</p>
        </div>
      </div>

      <DataTable columns={columns} data={payments} loading={loading} keyField="payment_id" emptyText="No payment records found" />
    </div>
  );
}
