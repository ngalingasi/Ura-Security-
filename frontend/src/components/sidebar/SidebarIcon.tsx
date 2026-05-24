interface SidebarIconProps {
  path:      string;
  className?: string;
}

export default function SidebarIcon({ path, className = 'w-[18px] h-[18px] flex-shrink-0' }: SidebarIconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
      dangerouslySetInnerHTML={{ __html: path }}
    />
  );
}
