'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { sectionIconPaths } from '@/lib/sectionIcons';

export default function SectionTabIcon() {
  const path = usePathname();
  const isGarments = path === '/garments' || path?.startsWith('/garments/');

  useEffect(() => {
    if (window.parent !== window) return;
    const paths = sectionIconPaths(!!isGarments);

    const sync = () => {
      // Safari can select any matching link, including a stale Apple touch
      // icon. Update the metadata links in place instead of appending a
      // competing favicon; also handle Next's streamed metadata on navigation.
      const update = (selector: string, rel: string, href: string, sizes?: string) => {
        const links = Array.from(document.head.querySelectorAll<HTMLLinkElement>(selector));
        if (!links.length) {
          const link = document.createElement('link');
          link.rel = rel;
          if (sizes) { link.sizes.value = sizes; link.type = 'image/png'; }
          link.setAttribute('href', href);
          document.head.append(link);
          return;
        }
        for (const link of links) {
          const selected = rel === 'icon' && link.sizes.value === '192x192' ? paths.large : href;
          if (link.getAttribute('href') !== selected) link.setAttribute('href', selected);
        }
      };
      update('link[rel~="icon"]', 'icon', paths.small, '32x32');
      update('link[rel="apple-touch-icon"],link[rel="apple-touch-icon-precomposed"]', 'apple-touch-icon', paths.apple, '180x180');
      update('link[rel="manifest"]', 'manifest', paths.manifest);
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.head, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });
    return () => observer.disconnect();
  }, [isGarments]);

  return null;
}
