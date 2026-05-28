import { useRef, useState } from 'react';
import { resolveFileUrl, isImage } from '../../modules/security-guards/api/guards.api';

const ALLOWED_TYPES = [
  'image/jpeg','image/jpg','image/png','image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_MB = 10;

interface AttachmentUploadProps {
  /** Existing URL from DB */
  currentUrl?:  string | null;
  /** Local preview URL (object URL for pending file) */
  previewUrl?:  string | null;
  onFileSelect: (file: File, preview: string) => void;
  onClear:      () => void;
  disabled?:    boolean;
  label?:       string;
}

export default function AttachmentUpload({
  currentUrl, previewUrl, onFileSelect, onClear, disabled, label = 'Attachment',
}: AttachmentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error,  setError]  = useState('');

  const resolvedUrl  = previewUrl ?? resolveFileUrl(currentUrl);
  const hasFile      = !!resolvedUrl;
  const isImg        = previewUrl ? /\.(jpe?g|png|webp)$/i.test(previewUrl) || previewUrl.startsWith('blob')
                                  : isImage(currentUrl);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Allowed: JPEG, PNG, WebP, PDF, DOC, DOCX');
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`Max file size is ${MAX_MB} MB`);
      return;
    }
    const preview = URL.createObjectURL(file);
    onFileSelect(file, preview);
  };

  return (
    <div className="space-y-1.5">
      <span className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {label}
      </span>

      {hasFile ? (
        <div className="flex items-center gap-2">
          {/* Preview */}
          {isImg ? (
            <a href={resolvedUrl!} target="_blank" rel="noreferrer"
              className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50">
              <img src={resolvedUrl!} alt="preview" className="w-full h-full object-cover"/>
            </a>
          ) : (
            <a href={resolvedUrl!} target="_blank" rel="noreferrer"
              className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8 13h8v1.5H8V13zm0 3h5v1.5H8V16zm0-6h2v1.5H8V10z"/>
              </svg>
            </a>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {previewUrl ? 'Pending upload' : currentUrl?.split('/').pop()}
            </p>
          </div>

          <div className="flex gap-1 flex-shrink-0">
            <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled}
              className="px-2 py-1 text-[10px] rounded border border-gray-300 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800">
              Change
            </button>
            <button type="button" onClick={onClear} disabled={disabled}
              className="px-2 py-1 text-[10px] rounded border border-red-200 dark:border-red-500/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-xs text-gray-400 hover:border-brand-400 hover:text-brand-500 dark:hover:border-brand-500 disabled:opacity-50">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
          </svg>
          Upload certificate / document
        </button>
      )}

      {error && <p className="text-[10px] text-red-500">{error}</p>}

      <input ref={inputRef} type="file"
        accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx"
        className="hidden" onChange={handleChange} />
    </div>
  );
}
