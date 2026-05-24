/**
 * UserAvatar — shows photo if available, falls back to coloured initials.
 * Used for both system users (auth) and security guards.
 */

const ROLE_COLORS: Record<string, string> = {
  super_admin: '#7c3aed',
  admin:       '#dc2626',
  manager:     '#2563eb',
  user:        '#059669',
  viewer:      '#6b7280',
  guard:       '#0891b2',
};

const SIZE: Record<string, { cls: string; text: string }> = {
  xs: { cls: 'w-7 h-7',  text: 'text-xs' },
  sm: { cls: 'w-9 h-9',  text: 'text-sm' },
  md: { cls: 'w-10 h-10',text: 'text-sm' },
  lg: { cls: 'w-12 h-12',text: 'text-base' },
  xl: { cls: 'w-16 h-16',text: 'text-xl' },
};

interface UserAvatarProps {
  fullName:   string;
  role?:      string;
  photoUrl?:  string | null;
  size?:      'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function UserAvatar({
  fullName, role = 'user', photoUrl, size = 'md', className = '',
}: UserAvatarProps) {
  const initials = fullName
    .split(' ')
    .slice(0, 2)
    .map(n => n[0] ?? '')
    .join('')
    .toUpperCase();

  const bg  = ROLE_COLORS[role] ?? '#6b7280';
  const { cls, text } = SIZE[size] ?? SIZE.md;
  const base = `inline-flex items-center justify-center rounded-full flex-shrink-0 select-none overflow-hidden ${cls} ${className}`;

  if (photoUrl) {
    return (
      <span className={base} aria-label={fullName}>
        <img
          src={photoUrl}
          alt={fullName}
          className="w-full h-full object-cover"
          onError={e => {
            // On broken image, hide the img and show initials fallback
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </span>
    );
  }

  return (
    <span
      className={`${base} font-semibold text-white ${text}`}
      style={{ backgroundColor: bg }}
      aria-label={fullName}
    >
      {initials}
    </span>
  );
}
