'use client';

import { useLayoutEffect, useRef } from 'react';
import { FAMILY_EMBED_URL } from '@/lib/externalLinks';
import './family-screen.css';

// Keep the current independently maintained Family experience intact.
// The surrounding page and navigation remain on grandmajazz.com.
export default function FamilyPage() {
  const screen = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const wrapper = document.querySelector('.gj-site-header-wrap');
    let headerHeight = window.innerWidth < 1050 ? 80 : 90;
    const measure = () => {
      const viewport = window.visualViewport;
      const header = document.querySelector<HTMLElement>('.gj-header-bar');
      // The menu replaces the header node, and entrance/hide transforms do
      // not describe the space that the finished header occupies.
      if (header?.offsetHeight) headerHeight = header.offsetHeight;
      const top = headerHeight + 8;
      const bottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight);
      screen.current?.style.setProperty('--family-top', `${top}px`);
      screen.current?.style.setProperty('--family-height', `${Math.max(160, bottom - top)}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (wrapper) observer.observe(wrapper);
    window.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('scroll', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('scroll', measure);
    };
  }, []);
  return (
    <section ref={screen} aria-label="Join the Grandma Jazz family" className="gj-family-screen">
        <iframe
          src={FAMILY_EMBED_URL}
          title="Grandma Jazz — Add Your Brick"
          className="gj-family-frame"
        />
    </section>
  );
}
