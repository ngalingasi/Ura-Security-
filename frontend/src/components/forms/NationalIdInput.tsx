import { useRef, useEffect } from 'react';

// Tanzania NIN real format: XXXXXXXX-XXXXX-XXXXX-X
// Groups: 8 digits (DOB yyyymmdd) - 5 digits - 5 digits - 1 digit = 19 total
const GROUPS  = [8, 5, 5, 1];
const TOTAL   = GROUPS.reduce((s, n) => s + n, 0); // 19
const MAX_LEN = TOTAL + GROUPS.length - 1;          // 19 + 3 dashes = 22

const onlyDigits = (v: string) => v.replace(/\D/g, '');

const applyFormat = (raw: string): string => {
  const d = onlyDigits(raw).slice(0, TOTAL);
  let out = '';
  let pos = 0;
  for (let g = 0; g < GROUPS.length; g++) {
    const chunk = d.slice(pos, pos + GROUPS[g]);
    if (!chunk) break;
    if (g > 0) out += '-';
    out += chunk;
    pos += GROUPS[g];
  }
  return out;
};

/**
 * After re-formatting, put the cursor at the right position.
 * Strategy: count how many digits were before the old cursor,
 * then find that same digit count in the new string.
 */
const calcCursor = (formatted: string, digitsBeforeCursor: number): number => {
  let count = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) {
      count++;
      if (count === digitsBeforeCursor) return i + 1;
    }
  }
  return formatted.length;
};

interface Props {
  label?:    string;
  required?: boolean;
  error?:    string;
  value:     string;
  onChange:  (value: string) => void;
  disabled?: boolean;
}

export default function NationalIdInput({
  label = 'National ID', required, error, value, onChange, disabled,
}: Props) {
  const inputRef  = useRef<HTMLInputElement>(null);
  const cursorRef = useRef(0);

  // Restore cursor after React re-renders
  useEffect(() => {
    const el = inputRef.current;
    if (!el || document.activeElement !== el) return;
    el.setSelectionRange(cursorRef.current, cursorRef.current);
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el        = e.currentTarget;
    const cursor    = el.selectionStart ?? 0;

    // How many digits were before the cursor in the RAW input value at time of change
    const digsBefore = onlyDigits(el.value.slice(0, cursor)).length;

    const newFormatted = applyFormat(el.value);
    cursorRef.current  = calcCursor(newFormatted, digsBefore);
    onChange(newFormatted);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const el  = inputRef.current;
    if (!el) return;
    const pos = el.selectionStart ?? 0;

    if (e.key === 'Backspace') {
      // If cursor is right after a dash, skip the dash and delete the digit before it
      if (pos > 0 && value[pos - 1] === '-') {
        e.preventDefault();
        const newRaw       = value.slice(0, pos - 2) + value.slice(pos);
        const newFormatted = applyFormat(newRaw);
        cursorRef.current  = Math.max(0, pos - 2);
        onChange(newFormatted);
      }
    }

    if (e.key === 'Delete') {
      // If cursor is ON a dash, skip over it
      if (value[pos] === '-') {
        e.preventDefault();
        el.setSelectionRange(pos + 1, pos + 1);
      }
    }

    // Prevent non-numeric keys (allow control keys)
    const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Enter','Home','End'];
    if (!allowed.includes(e.key) && !/^\d$/.test(e.key) && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
    }
  };

  const handleClick = () => {
    // If cursor lands ON a dash, nudge it one position right
    const el = inputRef.current;
    if (!el) return;
    const pos = el.selectionStart ?? 0;
    if (value[pos] === '-') {
      el.setSelectionRange(pos + 1, pos + 1);
    }
  };

  const filled = onlyDigits(value).length;
  const pct    = Math.round((filled / TOTAL) * 100);
  const valid  = filled === TOTAL;

  // Build placeholder with actual group sizes visible
  const placeholder = 'XXXXXXXX-XXXXX-XXXXX-X';

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onClick={handleClick}
          placeholder={placeholder}
          maxLength={MAX_LEN}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          className={[
            'w-full rounded-lg border px-3 pr-14 py-2.5 text-sm font-mono',
            'bg-white dark:bg-gray-800 text-gray-800 dark:text-white',
            'placeholder:text-gray-300 dark:placeholder:text-gray-600 placeholder:font-sans',
            'focus:outline-none focus:ring-2',
            error
              ? 'border-red-400 focus:border-red-400 focus:ring-red-500/10'
              : valid
              ? 'border-green-400 focus:border-green-400 focus:ring-green-500/10'
              : 'border-gray-300 dark:border-gray-700 focus:border-brand-400 focus:ring-brand-500/10',
            disabled ? 'opacity-50 cursor-not-allowed' : '',
          ].filter(Boolean).join(' ')}
        />

        {/* Counter badge */}
        <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold pointer-events-none ${valid ? 'text-green-500' : 'text-gray-400'}`}>
          {filled}/{TOTAL}
        </span>
      </div>

      {/* Progress */}
      {filled > 0 && !valid && (
        <div className="mt-1.5 h-0.5 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-brand-400 transition-all duration-100"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {/* Hint showing format */}
      {!value && !error && (
        <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
          Format: <span className="font-mono">XXXXXXXX-XXXXX-XXXXX-X</span> &nbsp;·&nbsp; {TOTAL} digits, dashes auto-added
        </p>
      )}

      {valid && !error && (
        <p className="mt-1 text-xs text-green-500 flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" clipRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
          </svg>
          Valid
        </p>
      )}

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
