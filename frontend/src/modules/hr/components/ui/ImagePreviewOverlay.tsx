import { useEffect } from 'react';

export interface ImagePreview { src: string; name: string; }

export function ImagePreviewOverlay({ preview, onClose }: { preview: ImagePreview | null; onClose: () => void }) {
  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [preview, onClose]);

  if (!preview) return null;
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/75" />
      <div className="relative max-w-lg w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
        <button onClick={onClose}
          className="absolute -top-10 right-0 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <img src={preview.src} alt={preview.name} className="max-w-full max-h-[75vh] rounded-2xl shadow-2xl object-contain bg-gray-900" />
        {preview.name && <p className="mt-3 text-sm font-medium text-white">{preview.name}</p>}
      </div>
    </div>
  );
}
