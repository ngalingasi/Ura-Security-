import { memo } from 'react';
import { FormInput, FormSelect } from './FormField';
import AttachmentUpload from './AttachmentUpload';
import type { GuardEducation } from '../../modules/security-guards/api/guards.api';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 60 }, (_, i) => {
  const y = CURRENT_YEAR - i;
  return { value: String(y), label: String(y) };
});

interface EducationFormProps {
  records:    GuardEducation[];
  levels:     string[];
  onChange:   (records: GuardEducation[]) => void;
  disabled?:  boolean;
}

const EducationForm = memo(function EducationForm({
  records, levels, onChange, disabled,
}: EducationFormProps) {

  const add = () => onChange([
    ...records,
    { level: '', institution_name: '', year_completed: null, attachment_url: null, _file: null, _preview: null },
  ]);

  const remove = (idx: number) => onChange(records.filter((_, i) => i !== idx));

  const set = (idx: number, field: keyof GuardEducation, value: any) => {
    const updated = [...records];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange(updated);
  };

  const handleFile = (idx: number, file: File, preview: string) => {
    const updated = [...records];
    updated[idx] = { ...updated[idx], _file: file, _preview: preview };
    onChange(updated);
  };

  const handleClear = (idx: number) => {
    const updated = [...records];
    updated[idx] = { ...updated[idx], _file: null, _preview: null, attachment_url: null };
    onChange(updated);
  };

  const levelOpts = levels.map(l => ({ value: l, label: l }));

  return (
    <div className="space-y-3">
      {records.length === 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 italic py-2">
          No education records yet. Click "Add" to add one.
        </p>
      )}

      {records.map((rec, idx) => (
        <div key={idx}
          className="relative rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40 p-4 space-y-3">

          {/* Remove button */}
          <button type="button" onClick={() => remove(idx)} disabled={disabled}
            className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
            <FormSelect
              label="Educational Level" required
              options={levelOpts}
              value={rec.level}
              onChange={e => set(idx, 'level', e.target.value)}
              placeholder="Select level"
              disabled={disabled}
            />
            <FormInput
              label="Institution Name" required
              value={rec.institution_name}
              onChange={e => set(idx, 'institution_name', e.target.value)}
              placeholder="e.g. University of Dar es Salaam"
              disabled={disabled}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormSelect
              label="Year Completed"
              options={YEARS}
              value={rec.year_completed ? String(rec.year_completed) : ''}
              onChange={e => set(idx, 'year_completed', e.target.value || null)}
              placeholder="Select year"
              disabled={disabled}
            />
            <AttachmentUpload
              label="Certificate / Transcript"
              currentUrl={rec.attachment_url}
              previewUrl={rec._preview}
              onFileSelect={(file, preview) => handleFile(idx, file, preview)}
              onClear={() => handleClear(idx)}
              disabled={disabled}
            />
          </div>
        </div>
      ))}

      <button type="button" onClick={add} disabled={disabled}
        className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-dashed border-brand-300 dark:border-brand-700 text-brand-500 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 disabled:opacity-50">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
        </svg>
        Add Education Record
      </button>
    </div>
  );
});

export default EducationForm;
