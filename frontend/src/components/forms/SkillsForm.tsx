import { memo } from 'react';
import { FormInput, FormSelect } from './FormField';
import AttachmentUpload from './AttachmentUpload';
import type { GuardSkill } from '../../modules/security-guards/api/guards.api';

const LEVEL_OPTS = [
  { value: 'beginner',     label: 'Beginner'     },
  { value: 'intermediate', label: 'Intermediate'  },
  { value: 'advanced',     label: 'Advanced'      },
  { value: 'expert',       label: 'Expert'        },
];

const LEVEL_COLORS: Record<string, string> = {
  beginner:     'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  intermediate: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
  advanced:     'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
  expert:       'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400',
};

export const SkillLevelBadge = ({ level }: { level?: string | null }) => {
  if (!level) return null;
  return (
    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full capitalize ${LEVEL_COLORS[level] ?? ''}`}>
      {level}
    </span>
  );
};

interface SkillsFormProps {
  records:   GuardSkill[];
  onChange:  (records: GuardSkill[]) => void;
  disabled?: boolean;
}

const SkillsForm = memo(function SkillsForm({ records, onChange, disabled }: SkillsFormProps) {
  const add = () => onChange([
    ...records,
    { skill_name: '', skill_level: null, attachment_url: null, _file: null, _preview: null },
  ]);

  const remove = (idx: number) => onChange(records.filter((_, i) => i !== idx));

  const set = (idx: number, field: keyof GuardSkill, value: any) => {
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

  return (
    <div className="space-y-3">
      {records.length === 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 italic py-2">
          No skills or certifications yet. Click "Add" to add one.
        </p>
      )}

      {records.map((rec, idx) => (
        <div key={idx}
          className="relative rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40 p-4 space-y-3">

          <button type="button" onClick={() => remove(idx)} disabled={disabled}
            className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
            <FormInput
              label="Skill / Certification Name" required
              value={rec.skill_name}
              onChange={e => set(idx, 'skill_name', e.target.value)}
              placeholder="e.g. First Aid, Firearm Handling"
              disabled={disabled}
            />
            <FormSelect
              label="Skill Level (optional)"
              options={LEVEL_OPTS}
              value={rec.skill_level ?? ''}
              onChange={e => set(idx, 'skill_level', e.target.value || null)}
              placeholder="Select level"
              disabled={disabled}
            />
          </div>

          <AttachmentUpload
            label="Certificate / Proof"
            currentUrl={rec.attachment_url}
            previewUrl={rec._preview}
            onFileSelect={(file, preview) => handleFile(idx, file, preview)}
            onClear={() => handleClear(idx)}
            disabled={disabled}
          />
        </div>
      ))}

      <button type="button" onClick={add} disabled={disabled}
        className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-dashed border-brand-300 dark:border-brand-700 text-brand-500 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 disabled:opacity-50">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
        </svg>
        Add Skill / Certification
      </button>
    </div>
  );
});

export default SkillsForm;
