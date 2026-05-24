import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';
const SIZE_CLS: Record<ModalSize, string> = {
  sm:   'max-w-md',
  md:   'max-w-lg',
  lg:   'max-w-2xl',
  xl:   'max-w-3xl',
  '2xl':'max-w-5xl',
};

interface ModalProps {
  isOpen:   boolean;
  onClose:  () => void;
  title:    string;
  children: ReactNode;
  size?:    ModalSize;
  footer?:  ReactNode;
}

export default function Modal({ isOpen, onClose, title, children, size = 'md', footer }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Lock body scroll without causing layout shift
  useEffect(() => {
    if (!isOpen) return;
    const scrollY = window.scrollY;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    // ── Outer overlay — NO backdrop-blur (kills GPU perf) ──────────────────────
    <div
      className="fixed inset-0 z-[99998] flex items-start justify-center overflow-y-auto"
      style={{ paddingTop: '5vh', paddingBottom: '5vh' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Semi-transparent backdrop — plain alpha only, no blur */}
      <div className="fixed inset-0 bg-black/40 dark:bg-black/60" aria-hidden="true" />

      {/* Modal panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className={`
          relative w-full ${SIZE_CLS[size]} mx-4
          bg-white dark:bg-gray-900
          rounded-2xl shadow-2xl
          border border-gray-200 dark:border-gray-700
          flex flex-col
        `}
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 overscroll-contain">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
