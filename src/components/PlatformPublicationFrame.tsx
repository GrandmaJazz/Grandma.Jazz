'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { useUI } from '@/contexts/UIContext';
import './platform-publication.css';

// The publication keeps its independent renderer, while the surrounding site
// and its single audio instance survive navigation into and out of the reader.
export default function PlatformPublicationFrame({ section }: { section: 'garments' | 'events' }) {
  const pathname = usePathname() || `/${section}/`;
  const router = useRouter();
  const { setIsCartOpen } = useCart();
  const { openLoginModal } = useUI();
  const frame = useRef<HTMLIFrameElement>(null);
  const initialPath = useRef(pathname);
  const path = useRef(pathname); path.current = pathname;
  const normalize = (value: string) => value.replace(/\/+$/, '') || '/';
  const sync = () => frame.current?.contentWindow?.postMessage({ type: 'gj:publication-path', path: path.current }, window.location.origin);

  useEffect(() => { sync(); }, [pathname]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      const message = event.data;
      if (message?.type === 'gj:publication-route' && typeof message.path === 'string' && message.path.startsWith(`/${section}`)) {
        // This is a position within the existing publication, not a new page.
        // Next's native history integration keeps usePathname in sync without
        // replacing the catch-all segment and restarting its iframe renderer.
        if (normalize(message.path) !== normalize(path.current)) window.history.replaceState(null, '', message.path);
      }
      if (message?.type === 'gj:site-navigation' && typeof message.path === 'string' && /^\/(?!\/|api\/|_next\/)/.test(message.path)) router.push(message.path);
      if (message?.type === 'gj:site-cart') setIsCartOpen(true);
      if (message?.type === 'gj:site-login') openLoginModal();
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [section, router, setIsCartOpen, openLoginModal]);

  return <section className="gj-publication-screen" data-publication-section={section} aria-label={section === 'garments' ? 'Garments magazine archive' : 'Grandma Jazz event'}>
    <iframe ref={frame} data-gj-publication="true" src={`${initialPath.current}?embedded=1`} title={section === 'garments' ? 'Garments newsstand and continuous magazine reader' : 'Event details and booking'} className="gj-publication-frame" onLoad={() => { sync(); window.dispatchEvent(new Event('gj:content-layout')); }} />
  </section>;
}
