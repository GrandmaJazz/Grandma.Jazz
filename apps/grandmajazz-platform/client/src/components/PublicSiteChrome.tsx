import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { SiteHeader } from "../../../../../shared/site/Header";
import { embeddedSiteAction } from "./EmbeddedSiteBridge";
export { SiteFooter as PublicSiteFooter } from "../../../../../shared/site/Footer";

export function PublicSiteHeader() {
  const [pathname] = useLocation();
  const [totalItems, setTotalItems] = useState(0);
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    try {
      setSignedIn(!!localStorage.getItem('token'));
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      if (Array.isArray(cart)) setTotalItems(cart.reduce((sum: number, item: { quantity?: number }) => sum + (Number(item.quantity) || 0), 0));
    } catch { /* Browsing remains available when storage is blocked. */ }
  }, []);
  return <SiteHeader pathname={pathname} totalItems={totalItems}
    onCart={() => { if (!embeddedSiteAction('gj:site-cart')) window.location.href = '/products/?cart=open'; }}
    onLogin={() => { if (!embeddedSiteAction('gj:site-login')) window.location.href = '/login/'; }}
    isAuthenticated={signedIn} user={signedIn ? { name: 'Account' } : null} />;
}
