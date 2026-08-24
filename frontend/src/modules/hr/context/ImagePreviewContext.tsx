import { createContext, useContext, useState, type ReactNode } from 'react';
import { ImagePreviewOverlay, type ImagePreview } from '../components/ui/ImagePreviewOverlay';

interface ImagePreviewCtx { open: (src: string, name: string) => void; }
const ImagePreviewContext = createContext<ImagePreviewCtx | null>(null);

export function ImagePreviewProvider({ children }: { children: ReactNode }) {
  const [preview, setPreview] = useState<ImagePreview | null>(null);
  return (
    <ImagePreviewContext.Provider value={{ open: (src, name) => setPreview({ src, name }) }}>
      {children}
      <ImagePreviewOverlay preview={preview} onClose={() => setPreview(null)} />
    </ImagePreviewContext.Provider>
  );
}

// Falls back to a no-op if used outside the provider (shouldn't happen once
// mounted at the app root, but avoids crashing any page that forgets it).
export function useImagePreview(): ImagePreviewCtx {
  const ctx = useContext(ImagePreviewContext);
  return ctx ?? { open: () => {} };
}
