import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import DataTable, { type Column } from '../../../components/tables/DataTable';
import PageHeader from '../../../components/ui/PageHeader';
import { expensesApi, type Expense } from '../api/operations.api';
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

export default function ExpensesPage() {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [busyId,   setBusyId]   = useState<number | null>(null);
  const [error,    setError]    = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await expensesApi.list({ page, limit: 10 });
      setExpenses(data.results);
      setTotal(data.totalResults);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const remove = async (exp: Expense) => {
    if (!confirm(`Delete expense ${exp.expense_number}?`)) return;
    setBusyId(exp.expense_id); setError('');
    try { await expensesApi.remove(exp.expense_id); load(); }
    catch (err) { setError(getErrorMessage(err, 'Failed to delete expense')); }
    finally { setBusyId(null); }
  };

  const columns: Column<Expense>[] = [
    { key: 'expense_number', header: 'No.', render: (r) => (
      <button onClick={() => navigate(ROUTES.EXPENSE_DETAIL.replace(':expenseId', String(r.expense_id)))}
        className="font-mono text-xs text-brand-600 dark:text-brand-400 hover:underline">{r.expense_number}</button>
    ) },
    { key: 'client_name', header: 'Client', render: (r) => <span className="text-gray-700 dark:text-gray-300">{r.client_name ?? '—'}</span> },
    { key: 'expense_date', header: 'Date', render: (r) => formatDate(r.expense_date) },
    { key: 'total_amount', header: 'Total', render: (r) => <span className="font-medium text-gray-800 dark:text-white">{fmtMoney(r.total_amount)}</span> },
    {
      key: 'actions', header: '', render: (r) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => navigate(ROUTES.EXPENSE_EDIT.replace(':expenseId', String(r.expense_id)))}
            className="h-8 px-2.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Edit</button>
          <button onClick={() => remove(r)} disabled={busyId === r.expense_id}
            className="h-8 px-2.5 rounded-lg text-xs font-medium border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">Delete</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Expenses" description={`${total} expense${total !== 1 ? 's' : ''}`}
        action={
          <button onClick={() => navigate(ROUTES.EXPENSE_NEW)}
            className="px-5 py-2 text-sm font-semibold bg-brand-500 text-white rounded-lg hover:bg-brand-600 whitespace-nowrap">
            + New Expense
          </button>
        }
      />
      <ErrorBanner msg={error} />
      <DataTable columns={columns} data={expenses} loading={loading} keyField="expense_id" emptyText="No expenses found" />
      {expenses.length > 0 && (
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
