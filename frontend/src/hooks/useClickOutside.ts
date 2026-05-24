import { useEffect, useRef } from 'react';

export function useClickOutside<T extends HTMLElement>(
  handler: () => void,
  excludeSelectors: string[] = []
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const listener = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (!ref.current || ref.current.contains(target)) return;
      // Optionally exclude other elements (e.g. toggle buttons)
      for (const sel of excludeSelectors) {
        if ((target as HTMLElement).closest?.(sel)) return;
      }
      handler();
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [handler, excludeSelectors]);

  return ref;
}
