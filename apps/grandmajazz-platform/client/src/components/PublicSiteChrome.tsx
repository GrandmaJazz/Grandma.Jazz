import { useState } from "react";
import "./public-site-chrome.css";

const links = [
  { href: "/products/", label: "Shop All" },
  { href: "/events/", label: "Events" },
  { href: "/family/", label: "Family" },
  { href: "/blogs/", label: "Blogs" },
];

export function PublicSiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="gj-site-header-wrap">
      <header className="gj-site-header">
        <button type="button" className="gj-site-menu-toggle" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
          <span /><span /><span />
        </button>
        <nav className={menuOpen ? "gj-site-nav gj-site-nav-open" : "gj-site-nav"} aria-label="Grandma Jazz navigation">
          {links.map(link => <a key={link.href} href={link.href}>{link.label}</a>)}
        </nav>
        <a className="gj-site-logo" href="/" aria-label="Grandma Jazz home">
          <img src="/images/Grandma-Jazz-Logo.webp" width="200" height="100" alt="Grandma Jazz" />
        </a>
        <div className="gj-site-header-right">
          <a href="/garments/" aria-current={location.pathname.startsWith("/garments") ? "page" : undefined}>Garments</a>
          <a href="/visit/">Visit</a>
        </div>
      </header>
    </div>
  );
}

export function PublicSiteFooter() {
  return (
    <footer className="gj-site-footer">
      <div className="gj-site-footer-inner">
        <div>
          <p className="gj-site-footer-kicker">Come and find us.</p>
          <p className="gj-site-footer-copy">Up in the Kamala hills. Find our entrance, opening hours and directions before you set off.</p>
          <a className="gj-site-footer-button" href="/visit/">Directions to Grandma Jazz →</a>
        </div>
        <div>
          <h2>Connect with us</h2>
          <p className="gj-site-footer-copy">Follow us on Instagram for the latest updates, behind-the-scenes content, and special announcements.</p>
          <a className="gj-site-footer-button" href="https://instagram.com/grandmajazzphuket" target="_blank" rel="noopener noreferrer">Follow us on Instagram</a>
          <h3>Get in Touch</h3>
          <div className="gj-site-footer-links">
            <a href="https://wa.me/66948605652">WhatsApp</a>
            <a href="mailto:grandmajazzphuket@gmail.com">Email</a>
            <a href="tel:+66948605652">Phone</a>
            <a href="https://maps.app.goo.gl/TwovCmqCYRTSkmtu7?g_st=com.google.maps.preview.copy">Google Maps</a>
          </div>
          <h3>Explore</h3>
          <nav className="gj-site-footer-links" aria-label="Site">
            <a href="/">Home</a><a href="/events/">Events</a><a href="/blogs/">Journal</a><a href="/products/">Shop</a><a href="/family/">Family</a><a href="/garments/">Garments</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
