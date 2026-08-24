import type { ReactNode } from 'react';

interface Column<T> { header: string; key?: keyof T; render?: (row: T) => ReactNode; className?: string; }
interface Props<T> { columns: Column<T>[]; data: T[]; loading?: boolean; emptyText?: string; rowKey: (row: T) => string|number; }

export default function Table<T>({ columns, data, loading, emptyText = 'No records found', rowKey }: Props<T>) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800/60">
          <tr>
            {columns.map(c => (
              <th key={c.header} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 whitespace-nowrap">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
          {loading ? (
            <tr><td colSpan={columns.length} className="px-4 py-12 text-center">
              <div className="flex items-center justify-center gap-2 text-gray-400">
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Loading...
              </div>
            </td></tr>
          ) : data.length === 0 ? (
            <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">{emptyText}</td></tr>
          ) : data.map(row => (
            <tr key={rowKey(row)} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
              {columns.map(c => (
                <td key={c.header} className={`px-4 py-3 text-gray-700 dark:text-gray-300 ${c.className||''}`}>
                  {c.render ? c.render(row) : String(c.key ? (row[c.key] ?? '—') : '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
