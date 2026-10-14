import { useEffect } from 'react';
import { useLocation } from 'wouter';
const isPublication = () => window.parent !== window && window.frameElement?.getAttribute('data-gj-publication') === 'true';

export function embeddedSiteAction(type: 'gj:site-cart' | 'gj:site-login') {
  if (!isPublication()) return false;
  window.parent.postMessage({ type }, window.location.origin);
  return true;
}

export function EmbeddedSiteBridge() {
  const [path, navigate] = useLocation();
  useEffect(() => {
    if (isPublication()) window.parent.postMessage({ type: 'gj:publication-route', path }, window.location.origin);
  }, [path]);
  useEffect(() => {
    if (!isPublication()) return;
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      const next = event.data;
      if (next?.type === 'gj:publication-path' && typeof next.path === 'string' && /^\/(garments|events)(\/|$)/.test(next.path) && next.path.replace(/\/+$/, '') !== path.replace(/\/+$/, '')) navigate(next.path, { replace: true });
    };
    const follow = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (!link || link.download || link.target === '_blank') return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname.replace(/\/+$/, '') === path.replace(/\/+$/, '')) return;
      // Edition navigation stays inside this reader. Other sections go through
      // the persistent parent router, preserving music, cart and login state.
      const section = path.startsWith('/garments') ? '/garments' : '/events';
      if ((url.pathname === section || url.pathname.startsWith(section + '/')) && !(section === '/events' && url.pathname.replace(/\/+$/, '') === section)) { event.preventDefault(); navigate(url.pathname); return; }
      event.preventDefault();
      window.parent.postMessage({ type: 'gj:site-navigation', path: url.pathname + url.search + url.hash }, window.location.origin);
    };
    window.addEventListener('message', receive);
    document.addEventListener('click', follow, true);
    return () => { window.removeEventListener('message', receive); document.removeEventListener('click', follow, true); };
  }, [path, navigate]);
  return null;
}
