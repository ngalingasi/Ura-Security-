import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
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

export default function ExpenseDetailPage() {
  const navigate = useNavigate();
  const { expenseId } = useParams<{ expenseId: string }>();
  const [exp, setExp] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await expensesApi.getById(Number(expenseId)); setExp(data); }
    catch (err) { setError(getErrorMessage(err)); setExp(null); }
    finally { setLoading(false); }
  }, [expenseId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="p-6 text-center text-gray-400">Loading…</div>;
  if (!exp) return (
    <div className="max-w-2xl mx-auto text-center py-20">
      <ErrorBanner msg={error} />
      <p className="text-gray-500 dark:text-gray-400 mb-4">Expense not found.</p>
      <button onClick={() => navigate(-1)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">← Go Back</button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-1.5">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Back
          </button>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">{exp.expense_number}</h1>
        </div>
        <button onClick={() => navigate(ROUTES.EXPENSE_EDIT.replace(':expenseId', String(exp.expense_id)))}
          className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">Edit</button>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Client</p><p className="text-gray-800 dark:text-white font-medium">{exp.client_name ?? '— internal —'}</p></div>
          <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Date</p><p className="text-gray-600 dark:text-gray-300">{formatDate(exp.expense_date)}</p></div>
          <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Total</p><p className="text-gray-800 dark:text-white font-medium">{fmtMoney(exp.total_amount)}</p></div>
        </div>
        {exp.notes && <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">{exp.notes}</p>}
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Line Items</h2>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60">
              <tr>{['Description', 'Qty', 'Unit Price', 'Subtotal'].map((h) => <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {(exp.items || []).map((it, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 text-gray-800 dark:text-white">{it.description}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{it.quantity}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{fmtMoney(it.unit_price)}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{fmtMoney(it.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-base font-bold text-gray-800 dark:text-white text-right mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">Total: {fmtMoney(exp.total_amount)}</p>
      </div>
    </div>
  );
}
