/**
 * Attendance pages — daily + monthly.
 *
 * Reworked from the ported version for the dual-reference design: there
 * is no more single 'port'/'tpfcs' user_type split — attendance covers
 * everyone (URA users + security guards combined) unless a specific
 * person_type filter is applied.
 *
 * APIs:
 *   Daily:   GET /v1/hr/attendance       { attendance_date, person_type? }
 *   Monthly: GET /v1/hr/attendance/range { fromDate, toDate, person_type? }
 */
import { useEffect, useState } from 'react';
import client from '../../../api/client';
import PageShell from '../components/ui/PageShell';
import Table from '../components/ui/Table';
import Badge, { statusVariant } from '../components/ui/Badge';
import DatePicker from '../components/ui/DatePicker';
import { formatDate } from '../../../utils/date';

type Mode = 'daily' | 'monthly';

function generateDateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const start = new Date(from + 'T00:00:00');
  const end   = new Date(to   + 'T00:00:00');
  while (start <= end) {
    dates.push(start.toISOString().split('T')[0]);
    start.setDate(start.getDate() + 1);
  }
  return dates;
}

function AttCell({ present }: { present: boolean }) {
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-bold
      ${present ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600'}`}>
      {present ? 'P' : 'A'}
    </span>
  );
}

interface Props {
  mode?:       Mode;
  personType?: 'user' | 'guard';
}

export default function AttendancePage({ mode = 'daily', personType }: Props) {
  const today        = new Date().toISOString().split('T')[0];
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const endOfMonth   = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];

  // daily
  const [date,      setDate]      = useState(today);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [dailyLoad, setDailyLoad] = useState(true);

  // monthly
  const [fromDate,  setFromDate]  = useState(startOfMonth);
  const [toDate,    setToDate]    = useState(endOfMonth);
  const [monthData, setMonthData] = useState<Record<string, any>>({});
  const [dateRange, setDateRange] = useState<string[]>([]);
  const [monthLoad, setMonthLoad] = useState(true);

  const [error, setError] = useState('');

  const label = personType === 'guard' ? 'Guard' : personType === 'user' ? 'Staff' : 'Personnel';

  useEffect(() => {
    if (mode !== 'daily') return;
    setDailyLoad(true); setError('');
    client.get('/v1/hr/attendance', { params: { attendance_date: date, person_type: personType } })
      .then(r => setDailyData(r.data?.data ?? r.data?.results ?? r.data ?? []))
      .catch(e => setError(e?.response?.data?.message || 'Failed to load attendance'))
      .finally(() => setDailyLoad(false));
  }, [date, mode, personType]);

  useEffect(() => {
    if (mode !== 'monthly') return;
    setMonthLoad(true); setError('');
    client.get('/v1/hr/attendance/range', { params: { fromDate, toDate, person_type: personType } })
      .then(r => {
        const d = r.data?.data ?? r.data ?? {};
        setMonthData(typeof d === 'object' && !Array.isArray(d) ? d : {});
        setDateRange(generateDateRange(fromDate, toDate));
      })
      .catch(e => setError(e?.response?.data?.message || e?.response?.data?.error || 'Failed to load monthly attendance'))
      .finally(() => setMonthLoad(false));
  }, [fromDate, toDate, mode, personType]);

  // ── Daily ─────────────────────────────────────────────────────────────────
  if (mode === 'daily') return (
    <PageShell
      title={`${label} Attendance`}
      subtitle={`Records for ${formatDate(date)}`}
      actions={<DatePicker value={date} onChange={setDate} />}
    >
      {error && <div className="mb-4 p-3 rounded-xl bg-red-50 text-sm text-red-600 border border-red-200">{error}</div>}
      <Table loading={dailyLoad} data={dailyData} rowKey={r => r.id ?? Math.random()}
        emptyText={`No attendance records for this date.`}
        columns={[
          { header: label,     render: r => <span className="font-medium text-gray-800 dark:text-white">{r.fullname ?? r.name ?? [r.fname, r.mname, r.lname].filter(Boolean).join(' ') ?? '—'}</span> },
          { header: 'Date',    render: r => <span className="text-gray-600 dark:text-gray-400">{formatDate(r.attendance_date ?? r.date)}</span> },
          { header: 'In Time', render: r => <span className="font-mono text-sm text-gray-700 dark:text-gray-300">{r.in_time ?? '—'}</span> },
          { header: 'Out',     render: r => <span className="font-mono text-sm text-gray-700 dark:text-gray-300">{r.out_time ?? '—'}</span> },
          { header: 'Status',  render: r => <Badge label={r.status ?? 'present'} variant={statusVariant(r.status)} /> },
        ]}
      />
    </PageShell>
  );

  // ── Monthly ───────────────────────────────────────────────────────────────
  const employees = Object.keys(monthData);

  return (
    <PageShell
      title={`Monthly ${label} Attendance`}
      subtitle={`${employees.length} ${employees.length !== 1 ? 'people' : 'person'} · ${formatDate(fromDate)} — ${formatDate(toDate)}`}
      actions={
        <div className="flex items-center gap-3">
          <DatePicker label="From" value={fromDate} onChange={v => { setFromDate(v); setDateRange([]); }} />
          <DatePicker label="To"   value={toDate}   onChange={v => { setToDate(v);   setDateRange([]); }} />
        </div>
      }
    >
      {error && <div className="mb-4 p-3 rounded-xl bg-red-50 text-sm text-red-600 border border-red-200">{error}</div>}

      {monthLoad ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : employees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
          <svg className="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          <p className="text-sm">No attendance records for the selected period</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
            <table className="text-xs border-collapse w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60">
                  <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 min-w-[160px]">
                    {label}
                  </th>
                  {dateRange.map(d => {
                    const dt = new Date(d + 'T00:00:00');
                    return (
                      <th key={d} className="px-1.5 py-3 text-center text-[10px] font-semibold text-gray-400 whitespace-nowrap min-w-[36px]">
                        <div>{dt.getDate()}</div>
                        <div className="text-gray-300 dark:text-gray-600">{dt.toLocaleDateString('en', { weekday: 'short' }).charAt(0)}</div>
                      </th>
                    );
                  })}
                  <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-green-500 whitespace-nowrap">P</th>
                  <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-red-400 whitespace-nowrap">A</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                {employees.map(empName => {
                  const record: Record<string, any> = monthData[empName] ?? {};
                  const presentDays = dateRange.filter(d => record[d]).length;
                  const absentDays  = dateRange.length - presentDays;
                  return (
                    <tr key={empName} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="sticky left-0 z-10 bg-white dark:bg-gray-900 px-4 py-2.5 font-medium text-gray-800 dark:text-white whitespace-nowrap text-sm">
                        {empName}
                      </td>
                      {dateRange.map(d => (
                        <td key={d} className="px-1 py-2.5 text-center">
                          <AttCell present={!!record[d]} />
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-center font-bold text-green-600 dark:text-green-400">{presentDays}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-red-500 dark:text-red-400">{absentDays}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-4 mt-3 px-1">
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded bg-green-100 dark:bg-green-500/20 flex items-center justify-center text-[10px] font-bold text-green-700 dark:text-green-400">P</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Present</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-400">A</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Absent</span>
            </div>
          </div>
        </>
      )}
    </PageShell>
  );
}
