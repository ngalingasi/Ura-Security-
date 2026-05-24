type StatusVariant = 'active' | 'inactive' | 'pending' | 'expired' | 'high' | 'medium' | 'low' | string;

const STYLES: Record<string, string> = {
  active:   'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
  inactive: 'bg-gray-100  text-gray-500  dark:bg-gray-700     dark:text-gray-400',
  pending:  'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
  expired:  'bg-red-100   text-red-700   dark:bg-red-500/20   dark:text-red-400',
  high:     'bg-red-100   text-red-700   dark:bg-red-500/20   dark:text-red-400',
  medium:   'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
  low:      'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
};

interface StatusBadgeProps {
  status:     StatusVariant;
  label?:     string;
  className?: string;
}

export default function StatusBadge({ status, label, className = '' }: StatusBadgeProps) {
  const styles = STYLES[status.toLowerCase()] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full capitalize ${styles} ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {label ?? status}
    </span>
  );
}
