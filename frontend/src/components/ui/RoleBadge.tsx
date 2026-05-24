const ROLE_STYLES: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',
  admin:       'bg-red-100    text-red-700    dark:bg-red-500/20    dark:text-red-300',
  manager:     'bg-blue-100   text-blue-700   dark:bg-blue-500/20   dark:text-blue-300',
  user:        'bg-gray-100   text-gray-700   dark:bg-gray-600/30   dark:text-gray-300',
  viewer:      'bg-gray-100   text-gray-500   dark:bg-gray-700      dark:text-gray-400',
};

interface RoleBadgeProps {
  role:       string;
  className?: string;
}

export default function RoleBadge({ role, className = '' }: RoleBadgeProps) {
  const label = role.replace(/_/g, ' ');
  const styles = ROLE_STYLES[role] ?? ROLE_STYLES.viewer;
  return (
    <span className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full capitalize ${styles} ${className}`}>
      {label}
    </span>
  );
}
