'use client';

import { useEffect } from 'react';

/**
 * Signals that React actually mounted, and fades out the server-rendered boot
 * screen (#gj-boot in layout.tsx).
 *
 * The homepage renders NOTHING visible on the server — the hero and its loading
 * logo are both gated behind a `mounted` effect, and the rest of the page is
 * pushed off-screen with translateY(100vh) until the hero is dismissed. So until
 * React hydrates, the first paint is a literal black screen. If hydration was
 * slow or failed, that black screen was all the visitor ever got.
 *
 * The boot screen closes that gap: it is in the HTML from the first byte, so
 * there is always something on screen, and this component takes it away the
 * moment React is alive.
 *
 * NOTE: never .remove() the node — it is rendered by the server layout and React
 * owns it. We only hide it, so reconciliation stays intact.
 */
export default function BootHandoff() {
  useEffect(() => {
    (window as unknown as { __gjBooted?: boolean }).__gjBooted = true;
    try {
      window.sessionStorage.removeItem('gj-boot-retry');
    } catch {
      /* storage unavailable — non-fatal */
    }
    document.getElementById('gj-boot')?.classList.add('gj-boot--done');
  }, []);

  return null;
}
