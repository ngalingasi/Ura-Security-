/**
 * DatePicker — exact copy from NewTheme/src/components/forms/DatePicker.tsx
 * Renders a styled display div with a calendar icon;
 * the real <input type="date"> sits invisible on top and opens the native picker.
 */
import { useRef } from 'react';

interface DatePickerProps {
  label?:     string;
  required?:  boolean;
  error?:     string;
  hint?:      string;
  value:      string;
  onChange:   (value: string) => void;
  min?:       string;
  max?:       string;
  disabled?:  boolean;
  readOnly?:  boolean;
  className?: string;
  placeholder?: string;
  /** Set false to hide the "Clear" link under the field. Defaults to true. */
  showClear?: boolean;
}

export default function DatePicker({
  label, required, error, hint, value, onChange,
  min, max, disabled, readOnly, className = '', placeholder, showClear = true,
}: DatePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Format YYYY-MM-DD → DD Mon YYYY for display
  const displayValue = (() => {
    if (!value) return '';
    try {
      const [y, m, d] = value.split('-').map(Number);
      if (!y || !m || !d) return '';
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return `${String(d).padStart(2,'0')} ${months[m-1]} ${y}`;
    } catch { return value; }
  })();

  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      {/* Wrapper — click anywhere opens the native picker */}
      <div
        className="relative cursor-pointer"
        onClick={() => !disabled && !readOnly && inputRef.current?.showPicker?.()}
      >
        {/* Calendar icon */}
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 z-10">
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
        </span>

        {/* Styled display */}
        <div className={[
          'w-full h-10 rounded-xl border pl-9 pr-3 text-sm pointer-events-none select-none',
          'flex items-center',
          'bg-white dark:bg-gray-800',
          !value
            ? 'text-gray-400 dark:text-gray-500'
            : 'text-gray-800 dark:text-white',
          error
            ? 'border-red-400'
            : 'border-gray-200 dark:border-gray-700 focus-within:border-brand-400',
          disabled || readOnly ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800/50' : '',
        ].filter(Boolean).join(' ')}>
          {displayValue || placeholder || 'Select date'}
        </div>

        {/* Real invisible input */}
        <input
          ref={inputRef}
          type="date"
          value={value}
          onChange={e => onChange(e.target.value)}
          min={min}
          max={max}
          disabled={disabled || readOnly}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          style={{ colorScheme: 'light dark' }}
        />
      </div>

      {/* Clear button */}
      {showClear && value && !disabled && !readOnly && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="mt-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          Clear
        </button>
      )}

      {hint  && !error && <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
