// Consistent avatar across the whole app — initials with role-coloured background

const ROLE_COLORS: Record<string, string> = {
  super_admin: '#7c3aed',
  admin:       '#dc2626',
  manager:     '#2563eb',
  user:        '#059669',
  viewer:      '#6b7280',
};

interface UserAvatarProps {
  fullName: string;
  role?:    string;
  size?:    'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE: Record<string, string> = {
  xs: 'w-7 h-7 text-xs',
  sm: 'w-9 h-9 text-sm',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

export default function UserAvatar({ fullName, role = 'user', size = 'md', className = '' }: UserAvatarProps) {
  const initials = fullName
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const bg = ROLE_COLORS[role] ?? '#6b7280';

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-semibold text-white flex-shrink-0 select-none ${SIZE[size]} ${className}`}
      style={{ backgroundColor: bg }}
      aria-label={fullName}
    >
      {initials}
    </span>
  );
}
