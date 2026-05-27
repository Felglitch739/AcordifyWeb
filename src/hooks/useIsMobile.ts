import { useEffect, useState } from 'react';

export function useIsMobile(maxWidth = 768): boolean {
  const query = `(max-width: ${maxWidth}px)`;
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const media = window.matchMedia(query);
    const handler = () => setIsMobile(media.matches);

    handler();
    media.addEventListener('change', handler);

    return () => {
      media.removeEventListener('change', handler);
    };
  }, [query]);

  return isMobile;
}

export default useIsMobile;
