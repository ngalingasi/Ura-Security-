import React from 'react';

// ── NO transition-colors — causes cursor activation delay ──────────────────────
const base = [
  'w-full rounded-lg border px-3 py-2.5 text-sm',
  'bg-white dark:bg-gray-800',
  'text-gray-800 dark:text-white',
  'border-gray-300 dark:border-gray-700',
  'placeholder:text-gray-400 dark:placeholder:text-gray-500',
  'focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10',
  'disabled:opacity-50 disabled:cursor-not-allowed',
  // intentionally no `transition-colors` — it delays cursor by 150ms
].join(' ');

// ── FieldWrapper ──────────────────────────────────────────────────────────────
interface FieldWrapperProps {
  label:      string;
  required?:  boolean;
  error?:     string;
  hint?:      string;
  children:   React.ReactNode;
  className?: string;
}
export function FieldWrapper({ label, required, error, hint, children, className = '' }: FieldWrapperProps) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{hint}</p>}
      {error          && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ── FormInput ─────────────────────────────────────────────────────────────────
type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string; required?: boolean; error?: string; hint?: string; wrapperClassName?: string;
};
export function FormInput({ label, required, error, hint, wrapperClassName, ...props }: InputProps) {
  return (
    <FieldWrapper label={label} required={required} error={error} hint={hint} className={wrapperClassName}>
      <input className={`${base} ${error ? 'border-red-400 focus:border-red-400 focus:ring-red-500/10' : ''}`} {...props} />
    </FieldWrapper>
  );
}

// ── FormTextarea ──────────────────────────────────────────────────────────────
type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string; required?: boolean; error?: string; hint?: string; wrapperClassName?: string;
};
export function FormTextarea({ label, required, error, hint, wrapperClassName, ...props }: TextareaProps) {
  return (
    <FieldWrapper label={label} required={required} error={error} hint={hint} className={wrapperClassName}>
      <textarea
        rows={3}
        className={`${base} resize-none ${error ? 'border-red-400' : ''}`}
        {...props}
      />
    </FieldWrapper>
  );
}

// ── FormSelect ────────────────────────────────────────────────────────────────
type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string; required?: boolean; error?: string; hint?: string;
  options: { value: string | number; label: string }[];
  placeholder?: string; wrapperClassName?: string;
};
export function FormSelect({ label, required, error, hint, options, placeholder, wrapperClassName, ...props }: SelectProps) {
  return (
    <FieldWrapper label={label} required={required} error={error} hint={hint} className={wrapperClassName}>
      <select className={`${base} ${error ? 'border-red-400' : ''}`} {...props}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={String(o.value)} value={o.value}>{o.label}</option>
        ))}
      </select>
    </FieldWrapper>
  );
}

// ── FormSection heading ───────────────────────────────────────────────────────
export function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
          {title}
        </p>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>
      {children}
    </div>
  );
}

// ── FormActions ───────────────────────────────────────────────────────────────
export function FormActions({
  onCancel, submitLabel = 'Save', loading = false, submitDisabled = false,
}: {
  onCancel: () => void; submitLabel?: string; loading?: boolean; submitDisabled?: boolean;
}) {
  return (
    <div className="flex justify-end gap-3 pt-2">
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={loading || submitDisabled}
        className="px-5 py-2 text-sm font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Saving…
          </span>
        ) : submitLabel}
      </button>
    </div>
  );
}
