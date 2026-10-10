'use client';

import { useLayoutEffect, useRef } from 'react';
import { FAMILY_EMBED_URL } from '@/lib/externalLinks';
import './family-screen.css';

// Keep the current independently maintained Family experience intact.
// The surrounding page and navigation remain on grandmajazz.com.
export default function FamilyPage() {
  const screen = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const header = document.querySelector('.gj-header-bar');
    const measure = () => {
      const viewport = window.visualViewport;
      const top = (header?.getBoundingClientRect().bottom ?? 80) + 8;
      const bottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight);
      screen.current?.style.setProperty('--family-top', `${top}px`);
      screen.current?.style.setProperty('--family-height', `${Math.max(160, bottom - top)}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (header) observer.observe(header);
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
        <div data-family-music-dock aria-hidden="true" />
    </section>
  );
}
