import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import StatusBadge from '../../../components/ui/StatusBadge';
import { invoicesApi, paymentsApi, type Invoice, type PaymentRecord } from '../api/operations.api';
import { fmtMoney } from '../components/LineItemsEditor';
import { formatDate } from '../../../utils/date';
import { getErrorMessage } from '../../../api/client';
import { ROUTES } from '../../../routes/routes';

const OPERATOR = { name: 'Ura Security', address: 'Dar es Salaam, Tanzania', phone: '', email: '' };

function printInvoice(inv: Invoice) {
  const lineRows = (inv.items || []).map((l, idx) => `
    <tr style="background:${idx % 2 === 0 ? '#fff' : '#f9f9f9'}">
      <td style="text-align:center">${idx + 1}</td>
      <td>${l.description}</td>
      <td style="text-align:center">${Number(l.quantity).toFixed(0)}</td>
      <td style="text-align:right">${fmtMoney(l.unit_price)}</td>
      <td style="text-align:right;font-weight:700">${fmtMoney(l.line_total)}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>Invoice ${inv.invoice_number}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,Helvetica,sans-serif;font-size:10pt;color:#000;background:#fff}
    .header{font-size:13pt;font-weight:900;text-align:center;letter-spacing:1px}
    .sub-header{font-size:8.5pt;text-align:center;color:#444;margin-bottom:4px}
    .divider{border-top:2px solid #000;margin:8px 0}
    .meta-table{width:100%;border-collapse:collapse;margin-bottom:10px}
    .meta-table td{padding:3px 6px;font-size:9pt;vertical-align:top}
    .meta-table td.label{font-weight:700;white-space:nowrap;width:130px}
    .inv-table{width:100%;border-collapse:collapse;margin-bottom:12px}
    .inv-table thead tr{background:#333;color:#fff}
    .inv-table th{padding:6px 8px;text-align:left;font-size:8pt;text-transform:uppercase;border-right:1px solid #555;font-weight:700}
    .inv-table th:last-child{border-right:none}
    .inv-table td{padding:5px 8px;font-size:9pt;border-bottom:1px solid #ddd;border-right:1px solid #ddd}
    .inv-table td:last-child{border-right:none}
    .totals{width:300px;margin-left:auto;border-collapse:collapse}
    .totals td{padding:4px 8px;font-size:10pt;border-bottom:1px solid #eee}
    .totals .total-row{font-weight:900;font-size:11pt;border-top:2px solid #000}
    .notes{margin-top:12px;font-size:8.5pt;color:#444;border-top:1px solid #ccc;padding-top:8px}
    .footer{margin-top:16px;font-size:8pt;color:#666;text-align:center}
    @page{size:A4;margin:12mm 15mm}
  </style></head><body>
  <div class="header">${OPERATOR.name}</div>
  <div class="sub-header">${[OPERATOR.address, OPERATOR.phone, OPERATOR.email].filter(Boolean).join(' | ')}</div>
  <div class="divider"></div>
  <table class="meta-table">
    <tr><td class="label">Date</td><td>${formatDate(inv.issued_date)}</td>
        <td style="text-align:right"></td><td style="text-align:right"><strong>${inv.client_name ?? ''}</strong></td></tr>
    <tr><td class="label">Invoice No:</td><td><strong>${inv.invoice_number}</strong></td>
        <td></td><td style="text-align:right">${inv.client_code ?? ''}</td></tr>
  </table>
  <table class="inv-table">
    <thead><tr>
      <th style="width:4%">S/N</th><th>Details</th>
      <th style="width:8%;text-align:center">Qty</th>
      <th style="width:14%;text-align:right">Price</th>
      <th style="width:16%;text-align:right">Total</th>
    </tr></thead>
    <tbody>${lineRows}</tbody>
  </table>
  <table class="totals">
    <tr><td>SUB TOTAL</td><td style="text-align:right">${fmtMoney(inv.subtotal)}</td></tr>
    ${inv.vat_enabled ? `<tr><td>VAT (${Number(inv.vat_rate).toFixed(0)}%)</td><td style="text-align:right">${fmtMoney(inv.vat_amount)}</td></tr>` : ''}
    ${inv.wht_enabled ? `<tr><td>WITHHOLDING TAX (${Number(inv.wht_rate).toFixed(0)}%)</td><td style="text-align:right">-${fmtMoney(inv.wht_amount)}</td></tr>` : ''}
    <tr class="total-row"><td>TOTAL</td><td style="text-align:right">${fmtMoney(inv.total_amount)}</td></tr>
  </table>
  ${inv.notes ? `<div class="notes">${String(inv.notes).replace(/\n/g, '<br>')}</div>` : ''}
  <div class="footer">${inv.invoice_number}</div>
  </body></html>`;

  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return;
  w.document.open(); w.document.write(html); w.document.close();
  w.onload = () => { w.focus(); w.print(); };
}

function ErrorBanner({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
      {msg}
    </div>
  );
}

export default function InvoiceDetailPage() {
  const navigate = useNavigate();
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [inv,      setInv]      = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [busy,     setBusy]     = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payFile,   setPayFile]   = useState<File | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, payRes] = await Promise.all([
        invoicesApi.getById(Number(invoiceId)),
        paymentsApi.list({ invoice_id: Number(invoiceId) }),
      ]);
      setInv(invRes.data);
      setPayAmount(String(invRes.data.total_amount));
      setPayments(payRes.data);
    } catch (err) { setError(getErrorMessage(err)); setInv(null); }
    finally { setLoading(false); }
  }, [invoiceId]);

  useEffect(() => { load(); }, [load]);

  const approve = async () => {
    setBusy(true); setError('');
    try { await invoicesApi.approve(Number(invoiceId)); setNotice('Invoice approved'); load(); }
    catch (err) { setError(getErrorMessage(err, 'Failed to approve')); }
    finally { setBusy(false); }
  };

  const cancel = async () => {
    if (!confirm(`Cancel invoice ${inv?.invoice_number}?`)) return;
    setBusy(true); setError('');
    try { await invoicesApi.cancel(Number(invoiceId)); setNotice('Invoice cancelled'); load(); }
    catch (err) { setError(getErrorMessage(err, 'Failed to cancel')); }
    finally { setBusy(false); }
  };

  const recordPayment = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setBusy(true); setError('');
    try {
      const fd = new FormData();
      fd.append('amount', payAmount);
      if (payFile) fd.append('evidence', payFile);
      await invoicesApi.recordPayment(Number(invoiceId), fd);
      setNotice('Payment recorded — invoice marked as paid');
      load();
    } catch (err) { setError(getErrorMessage(err, 'Failed to record payment')); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="p-6 text-center text-gray-400">Loading…</div>;
  if (!inv) return (
    <div className="max-w-2xl mx-auto text-center py-20">
      <p className="text-gray-500 dark:text-gray-400 mb-4">Invoice not found.</p>
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
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">{inv.invoice_number}</h1>
          <StatusBadge status={inv.status} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => printInvoice(inv)}
            className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-1.5">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Print / PDF
          </button>
          {inv.status === 'invoiced' && (
            <button onClick={() => navigate(ROUTES.INVOICE_EDIT.replace(':invoiceId', String(inv.invoice_id)))}
              className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">Edit</button>
          )}
          {inv.status === 'invoiced' && (
            <button onClick={approve} disabled={busy} className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg">Approve</button>
          )}
          {['invoiced', 'approved'].includes(inv.status) && (
            <button onClick={cancel} disabled={busy} className="px-4 py-2 text-sm font-medium border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg">Cancel</button>
          )}
        </div>
      </div>

      <ErrorBanner msg={error} />
      {notice && <div className="mb-2 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 px-4 py-3 text-sm text-green-700 dark:text-green-400">{notice}</div>}

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Client</p><p className="text-gray-800 dark:text-white font-medium">{inv.client_name}</p></div>
          <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Issued</p><p className="text-gray-600 dark:text-gray-300">{formatDate(inv.issued_date)}</p></div>
          <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Due</p><p className="text-gray-600 dark:text-gray-300">{inv.due_date ? formatDate(inv.due_date) : '—'}</p></div>
        </div>
        {inv.notes && <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">{inv.notes}</p>}
        {inv.status === 'cancelled' && inv.cancellation_reason && (
          <p className="text-sm text-red-500 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">Cancellation reason: {inv.cancellation_reason}</p>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Line Items</h2>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60">
              <tr>{['Description', 'Qty', 'Unit Price', 'Subtotal'].map((h) => <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {(inv.items || []).map((it, i) => (
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
        <div className="text-sm space-y-1 text-right mt-4">
          <p className="text-gray-500">Subtotal: <span className="text-gray-800 dark:text-white font-medium">{fmtMoney(inv.subtotal)}</span></p>
          {!!inv.vat_enabled && <p className="text-gray-500">+ VAT ({inv.vat_rate}%): <span className="text-gray-800 dark:text-white font-medium">{fmtMoney(inv.vat_amount)}</span></p>}
          {!!inv.wht_enabled && <p className="text-gray-500">− WHT ({inv.wht_rate}%): <span className="text-gray-800 dark:text-white font-medium">{fmtMoney(inv.wht_amount)}</span></p>}
          <p className="text-base font-bold text-gray-800 dark:text-white pt-1 border-t border-gray-200 dark:border-gray-700">Total: {fmtMoney(inv.total_amount)}</p>
        </div>
      </div>

      {inv.status === 'approved' && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Record Payment</h2>
          <form onSubmit={recordPayment} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Amount Paid</label>
              <input type="number" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)}
                className="w-full rounded-lg border px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-white border-gray-300 dark:border-gray-700" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Evidence (bank slip, etc.)</label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setPayFile(e.target.files?.[0] ?? null)}
                className="w-full text-xs text-gray-600 dark:text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-brand-50 file:text-brand-600 hover:file:bg-brand-100" />
            </div>
            <button type="submit" disabled={busy} className="h-10 px-6 rounded-lg text-sm font-semibold bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white">{busy ? 'Recording…' : 'Mark as Paid'}</button>
          </form>
        </div>
      )}

      {payments.length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Payment History</h2>
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.payment_id} className="flex items-center justify-between text-sm py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <span className="font-medium text-gray-800 dark:text-white">{fmtMoney(p.amount)}</span>
                <span className="text-gray-500 dark:text-gray-400">{formatDate(p.paid_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
