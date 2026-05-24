import { useEffect } from 'react';
import { createPortal } from 'react-dom';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';
const SIZE_CLS: Record<ModalSize, string> = {
  sm:  'max-w-md',
  md:  'max-w-lg',
  lg:  'max-w-2xl',
  xl:  'max-w-3xl',
  '2xl': 'max-w-5xl',
};

interface ModalProps {
  isOpen:    boolean;
  onClose:   () => void;
  title:     string;
  children:  React.ReactNode;
  size?:     ModalSize;
  footer?:   React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children, size = 'md', footer }: ModalProps) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-[2px]"
        onClick={onClose}
      />
      {/* Panel */}
      <div className={`relative w-full ${SIZE_CLS[size]} bg-white dark:bg-gray-900
        rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700
        flex flex-col max-h-[calc(100vh-3rem)]`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400
              hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
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
