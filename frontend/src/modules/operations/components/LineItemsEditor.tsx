import type { LineItem, CatalogItem } from '../api/operations.api';

const inCls = 'w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-white border-gray-300 dark:border-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10';
const selCls = inCls;

export function fmtMoney(v: number | string | null | undefined): string {
  const n = Number(v) || 0;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function LineItemsEditor({
  items, onChange, catalog = [],
}: {
  items: LineItem[];
  onChange: (rows: LineItem[]) => void;
  catalog?: CatalogItem[];
}) {
  const addRow = () => onChange([...items, { item_id: null, description: '', unit: 'unit', quantity: 1, unit_price: 0 }]);
  const removeRow = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const setRow = (idx: number, patch: Partial<LineItem>) =>
    onChange(items.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const total = items.reduce((sum, r) => sum + (Number(r.quantity) || 0) * (Number(r.unit_price) || 0), 0);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/60">
            <tr>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Item / Description</th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 w-20">Qty</th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 w-28">Unit Price</th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 w-28">Subtotal</th>
              <th className="px-3 py-2 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {items.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400 text-xs">No items added yet.</td></tr>
            ) : items.map((row, idx) => (
              <tr key={idx}>
                <td className="px-3 py-2 space-y-1.5">
                  {catalog.length > 0 && (
                    <select
                      value={row.item_id ?? ''}
                      onChange={(e) => {
                        const c = catalog.find((c) => String(c.item_id) === e.target.value);
                        setRow(idx, {
                          item_id: e.target.value ? Number(e.target.value) : null,
                          description: c ? c.name : row.description,
                          unit: c?.unit ?? row.unit,
                          unit_price: c ? c.default_rate : row.unit_price,
                        });
                      }}
                      className={selCls}
                    >
                      <option value="">Free text…</option>
                      {catalog.map((c) => <option key={c.item_id} value={c.item_id}>{c.name}</option>)}
                    </select>
                  )}
                  <input value={row.description} onChange={(e) => setRow(idx, { description: e.target.value })}
                    placeholder="Description" className={inCls} />
                </td>
                <td className="px-3 py-2">
                  <input type="number" min="0" value={row.quantity} onChange={(e) => setRow(idx, { quantity: Number(e.target.value) })} className={inCls} />
                </td>
                <td className="px-3 py-2">
                  <input type="number" min="0" step="0.01" value={row.unit_price} onChange={(e) => setRow(idx, { unit_price: Number(e.target.value) })} className={inCls} />
                </td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {fmtMoney((Number(row.quantity) || 0) * (Number(row.unit_price) || 0))}
                </td>
                <td className="px-3 py-2">
                  <button type="button" onClick={() => removeRow(idx)} className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10">
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between">
        <button type="button" onClick={addRow} className="flex items-center gap-1.5 text-xs font-medium text-brand-500 hover:text-brand-600">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Add Item
        </button>
        <p className="text-sm font-semibold text-gray-800 dark:text-white">Subtotal: {fmtMoney(total)}</p>
      </div>
    </div>
  );
}
