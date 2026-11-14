'use client';

import { useLayoutEffect, useRef } from 'react';
import { FAMILY_EMBED_URL } from '@/lib/externalLinks';
import './family-screen.css';
import { observeFamilyViewport } from './familyViewport';

// Vercel builds the embedded Family UI with the surrounding site.
// The existing member and signup APIs are still routed to the platform.
export default function FamilyPage() {
  const screen = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (screen.current) return observeFamilyViewport(screen.current);
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
