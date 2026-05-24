interface SidebarToggleButtonProps {
  onClick: () => void;
}

export default function SidebarToggleButton({ onClick }: SidebarToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Toggle sidebar"
      className="flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200
        text-gray-500 transition-colors
        hover:bg-gray-100 hover:text-gray-700
        dark:border-gray-800 dark:text-gray-400
        dark:hover:bg-gray-800 dark:hover:text-white
        focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
    >
      <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
        <path fillRule="evenodd" clipRule="evenodd"
          d="M0 1C0 .448.448 0 1 0h16a1 1 0 1 1 0 2H1a1 1 0 0 1-1-1zm0 6a1 1 0 0 1 1-1h16a1 1 0 1 1 0 2H1a1 1 0 0 1-1-1zm1 5a1 1 0 1 0 0 2h10a1 1 0 1 0 0-2H1z"
          fill="currentColor"/>
      </svg>
    </button>
  );
}
