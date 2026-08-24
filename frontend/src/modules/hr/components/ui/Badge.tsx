const VARIANTS = {
  success: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400',
  error:   'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  warning: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400',
  info:    'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  default: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  brand:   'bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400',
};

interface Props { label: string; variant?: keyof typeof VARIANTS; }
export default function Badge({ label, variant = 'default' }: Props) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${VARIANTS[variant]}`}>
      {label}
    </span>
  );
}

export function statusVariant(status: string | number | undefined | null): keyof typeof VARIANTS {
  const s = String(status ?? '').toLowerCase();
  if (['active','approved','sent','completed'].includes(s)) return 'success';
  if (['inactive','rejected','failed','suspended'].includes(s)) return 'error';
  if (['pending','on_leave'].includes(s)) return 'warning';
  if (['info','processing'].includes(s)) return 'info';
  return 'default';
}
