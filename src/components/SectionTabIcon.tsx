'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function SectionTabIcon() {
  const path = usePathname();
  const isGarments = path === '/garments' || path?.startsWith('/garments/');

  useEffect(() => {
    // Reinsert the icon on cross-section client navigation so Safari refreshes the tab.
    if (window.parent !== window) return;
    const icon = document.createElement('link');
    icon.rel = 'icon';
    icon.type = 'image/png';
    icon.sizes.value = '32x32';
    icon.href = isGarments
      ? '/icons/garments-g-32-v2.png?v=3'
      : '/icons/grandma-jazz-digital-32-v2.png?v=3';
    document.head.append(icon);
    return () => icon.remove();
  }, [isGarments]);

  return null;
}
