import React from 'react';

export interface Column<T> {
  key:       string;
  header:    string;
  render?:   (row: T) => React.ReactNode;
  width?:    string;
  className?: string;
}

interface DataTableProps<T> {
  columns:   Column<T>[];
  data:      T[];
  loading?:  boolean;
  emptyText?: string;
  keyField:  keyof T;
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

export default function DataTable<T>({
  columns, data, loading, emptyText = 'No records found', keyField,
}: DataTableProps<T>) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap ${col.width ?? ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={columns.length} />)
              : data.length === 0
              ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-gray-400 dark:text-gray-500">
                    {emptyText}
                  </td>
                </tr>
              )
              : data.map((row) => (
                <tr
                  key={String(row[keyField])}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 text-gray-700 dark:text-gray-300 ${col.className ?? ''}`}>
                      {col.render ? col.render(row) : String((row as any)[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
