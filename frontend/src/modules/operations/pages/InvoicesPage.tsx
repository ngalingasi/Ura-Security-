import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import DataTable, { type Column } from '../../../components/tables/DataTable';
import PageHeader from '../../../components/ui/PageHeader';
import StatusBadge from '../../../components/ui/StatusBadge';
import { invoicesApi, type Invoice } from '../api/operations.api';
import { fmtMoney } from '../components/LineItemsEditor';
import { formatDate } from '../../../utils/date';
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

export default function InvoicesPage() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [busyId,   setBusyId]   = useState<number | null>(null);
  const [error,    setError]    = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await invoicesApi.list({ page, limit: 10, status: statusFilter || undefined });
      setInvoices(data.results);
      setTotal(data.totalResults);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const approve = async (inv: Invoice) => {
    setBusyId(inv.invoice_id); setError('');
    try { await invoicesApi.approve(inv.invoice_id); load(); }
    catch (err) { setError(getErrorMessage(err, 'Failed to approve invoice')); }
    finally { setBusyId(null); }
  };

  const cancel = async (inv: Invoice) => {
    if (!confirm(`Cancel invoice ${inv.invoice_number}?`)) return;
    setBusyId(inv.invoice_id); setError('');
    try { await invoicesApi.cancel(inv.invoice_id); load(); }
    catch (err) { setError(getErrorMessage(err, 'Failed to cancel invoice')); }
    finally { setBusyId(null); }
  };

  const columns: Column<Invoice>[] = [
    { key: 'invoice_number', header: 'No.', render: (r) => (
      <button onClick={() => navigate(ROUTES.INVOICE_DETAIL.replace(':invoiceId', String(r.invoice_id)))}
        className="font-mono text-xs text-brand-600 dark:text-brand-400 hover:underline">{r.invoice_number}</button>
    ) },
    { key: 'client_name',    header: 'Client', render: (r) => <span className="font-semibold text-gray-800 dark:text-white">{r.client_name}</span> },
    { key: 'issued_date',    header: 'Issued', render: (r) => formatDate(r.issued_date) },
    { key: 'total_amount',   header: 'Total', render: (r) => <span className="font-medium text-gray-800 dark:text-white">{fmtMoney(r.total_amount)}</span> },
    { key: 'status',         header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: '', render: (r) => (
        <div className="flex items-center gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
          {r.status === 'invoiced' && (
            <button onClick={() => approve(r)} disabled={busyId === r.invoice_id}
              className="h-8 px-2.5 rounded-lg text-xs font-medium border border-blue-200 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">Approve</button>
          )}
          {['invoiced', 'approved'].includes(r.status) && (
            <button onClick={() => cancel(r)} disabled={busyId === r.invoice_id}
              className="h-8 px-2.5 rounded-lg text-xs font-medium border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">Cancel</button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader title="Invoices" description={`${total} invoice${total !== 1 ? 's' : ''}`}
        action={
          <div className="flex items-center gap-2">
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="rounded-lg border px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-white border-gray-300 dark:border-gray-700">
              <option value="">All statuses</option>
              <option value="invoiced">Invoiced</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button onClick={() => navigate(ROUTES.INVOICE_NEW)}
              className="px-5 py-2 text-sm font-semibold bg-brand-500 text-white rounded-lg hover:bg-brand-600 whitespace-nowrap">
              + New Invoice
            </button>
          </div>
        }
      />
      <ErrorBanner msg={error} />
      <DataTable columns={columns} data={invoices} loading={loading} keyField="invoice_id" emptyText="No invoices found" />
      {invoices.length > 0 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {Math.max(1, Math.ceil(total / 10))}</p>
          <div className="flex gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800">Prev</button>
            <button onClick={() => setPage((p) => (p * 10 < total ? p + 1 : p))} disabled={page * 10 >= total}
              className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
