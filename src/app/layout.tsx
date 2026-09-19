//layout.tsx
import { ClientBody } from "./ClientBody";
import "./globals.css";
import BootHandoff from "@/components/BootHandoff";
import { CartDrawer } from "@/components/CartDrawer";
import ConditionalHeader from "@/components/ConditionalHeader"; // เปลี่ยนจาก Header เป็น ConditionalHeader
import {
  ppEditorialUltralight,
  ppEditorialUltralightItalic,
  roboto,
  robotoMono,
  suisseIntl,
  suisseIntlMono,
} from "@/lib/fonts";
import type { Metadata, Viewport } from "next";

const BOOT_TRAIL_SEGMENTS = [
  { offset: 0, length: 3.8, opacity: 1, width: 1 },
  { offset: 3.5, length: 3.8, opacity: 0.7, width: 0.88 },
  { offset: 7, length: 4, opacity: 0.45, width: 0.75 },
  { offset: 10.7, length: 4.3, opacity: 0.25, width: 0.62 },
  { offset: 14.7, length: 4.6, opacity: 0.1, width: 0.5 },
] as const;

export const metadata: Metadata = {
  title: {
    default: "Grandma Jazz | Coffee & Cannabis Café in Kamala, Phuket",
    template: "%s | Grandma Jazz",
  },
  description:
    "A coffee and cannabis café in Kamala, Phuket — Phuket-roasted coffee, mountain views, and organic cannabis from local Thai farmers. The world's first plastic-free café.",
  keywords:
    "coffee shop Kamala, café Kamala, coffee Phuket, cannabis café Phuket, plastic-free dispensary, weed shop Kamala, cannabis dispensary Phuket, jazz cafe Phuket, Kamala cannabis, organic cannabis Thailand, Grandma Jazz",
  authors: [{ name: "Grandma Jazz" }],
  creator: "Grandma Jazz",
  publisher: "Grandma Jazz",

  // Robots - Allow search engines to index
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // Icons
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", type: "image/png" },
      {
        url: "/icons/GrandmaJazz-192.webp",
        sizes: "192x192",
        type: "image/webp",
      },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/icons/GrandmaJazz-512.webp",
      },
    ],
  },

  // Open Graph
  openGraph: {
    title: "Grandma Jazz | Coffee & Cannabis Café in Kamala, Phuket",
    description:
      "A coffee and cannabis café in Kamala, Phuket — Phuket-roasted coffee, mountain views, and organic cannabis from local Thai farmers. The world's first plastic-free café.",
    url: "https://www.grandmajazz.com",
    siteName: "Grandma Jazz",
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Grandma Jazz — coffee and cannabis café in Kamala, Phuket",
      },
    ],
    locale: "en_US",
    type: "website",
  },

  // Twitter
  twitter: {
    card: "summary_large_image",
    site: "@grandma_jazz",
    creator: "@grandma_jazz",
    title: "Grandma Jazz | Coffee & Cannabis Café in Kamala, Phuket",
    description:
      "A coffee and cannabis café in Kamala, Phuket — the world's first plastic-free café.",
    images: ["/images/twitter-image.jpg"],
  },

  // Additional
  manifest: "/manifest.json",

  // Canonical URL
  metadataBase: new URL("https://www.grandmajazz.com"),
  alternates: {
    canonical: "/",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#181818",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to external domains */}
        {/* PERF: album covers + card data come from S3 and the API on a cold
            connection ~2s into the page. Warming DNS/TLS here shaves the
            handshake off the first cover request. */}
        <link
          rel="preconnect"
          href="https://grandma-jazz-uploads.s3.ap-southeast-2.amazonaws.com"
        />
        <link rel="preconnect" href="https://grandma-jazz-api.onrender.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://www.gstatic.com" />

        {/* Critical boot-screen CSS — inlined so it needs no extra request and
            applies on the very first paint. See BootHandoff.tsx for why. */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
#gj-boot{position:fixed;inset:0;z-index:2147483000;background:#0A0A0A;display:flex;align-items:center;justify-content:center;opacity:1;visibility:visible;transition:opacity .45s ease-out,visibility 0s linear 0s}
#gj-boot.gj-boot--done{opacity:0;visibility:hidden;pointer-events:none;transition:opacity .45s ease-out,visibility 0s linear .45s}
#gj-boot .gj-boot-mark{position:relative;width:200px;height:65.2px}
#gj-boot .gj-boot-mark img{width:100%;height:100%;object-fit:contain;filter:grayscale(1);opacity:.4}
#gj-boot .gj-boot-mark svg{position:absolute;inset:0;filter:drop-shadow(0 0 4px rgba(255,255,255,.7))}
#gj-boot .gj-boot-trail{will-change:stroke-dashoffset}
#gj-boot-msg{display:none;position:absolute;left:50%;transform:translateX(-50%);top:calc(50% + 70px);width:100%;max-width:22rem;padding:0 1.5rem;text-align:center;color:#F5F1E6;font-size:.95rem;line-height:1.5}
#gj-boot-msg.gj-show{display:block;opacity:.85}
#gj-boot-msg button{margin-top:.9rem;padding:.55rem 1.4rem;border:1px solid rgba(245,241,230,.5);border-radius:999px;background:transparent;color:#F5F1E6;font:inherit;cursor:pointer;transition:all .2s ease-out}
#gj-boot-msg button:hover{background:rgba(245,241,230,.1);transform:translateY(-1px)}
#gj-boot-msg button:active{transform:scale(.97)}
@media (prefers-reduced-motion:reduce){#gj-boot .gj-boot-trail{display:none}}
`,
          }}
        />

        {/* Structured Data for Google Search */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": ["Cafe", "Store"],
              name: "Grandma Jazz",
              alternateName: "Grandma Jazz Cannabis Café",
              description:
                "The world's first plastic-free cannabis dispensary. A jazz café in Kamala, Phuket, serving organic cannabis from local Thai farmers, Phuket-roasted coffee, and a fully plant-based menu.",
              slogan: "You can't get higher than high.",
              url: "https://www.grandmajazz.com",
              logo: "https://www.grandmajazz.com/icons/GrandmaJazz.webp",
              image: "https://www.grandmajazz.com/images/og-image.jpg",
              telephone: "+66948605652",
              address: {
                "@type": "PostalAddress",
                streetAddress: "13/20 Moo 6",
                addressLocality: "Kamala",
                addressRegion: "Phuket",
                postalCode: "83150",
                addressCountry: "TH",
              },
              geo: {
                "@type": "GeoCoordinates",
                latitude: 7.9431224,
                longitude: 98.2781763,
              },
              openingHoursSpecification: [
                {
                  "@type": "OpeningHoursSpecification",
                  dayOfWeek: [
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                  ],
                  opens: "10:00",
                  closes: "20:00",
                },
              ],
              servesCuisine: "Coffee, Tea, Vegan",
              priceRange: "$$",
              currenciesAccepted: "THB",
              paymentAccepted: "Cash, PromptPay, Credit Card",
              sameAs: [
                "https://www.instagram.com/grandmajazzphuket",
                "https://www.facebook.com/Grandmajazzphuket",
                "https://x.com/grandma_jazz",
              ],
            }),
          }}
        />
      </head>
      <body
        className={`${suisseIntl.variable} ${suisseIntlMono.variable} ${ppEditorialUltralight.variable} ${ppEditorialUltralightItalic.variable} ${roboto.variable} ${robotoMono.variable} bg-telepathic-black text-white min-h-screen flex flex-col`}
      >
        {/* ----------------------------------------------------------------
            BOOT SCREEN — server-rendered, so there is always something on
            screen from the first byte. Previously the homepage painted pure
            black until React hydrated and a chain of timers elapsed; if
            anything in that chain stalled or threw, the visitor just saw a
            black page and had to guess to hit refresh.
            BootHandoff (below) fades this out as soon as React mounts.
        ---------------------------------------------------------------- */}
        <div id="gj-boot" role="status" aria-label="Loading Grandma Jazz">
          <div className="gj-boot-mark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/Grandma-Jazz-Logo-Heavier.webp"
              alt="Grandma Jazz"
              width={200}
              height={65}
            />
            <svg
              width="200"
              height="65.2"
              viewBox="0 0 200 65.2"
              aria-hidden="true"
            >
              {BOOT_TRAIL_SEGMENTS.map((segment) => (
                <rect
                  key={segment.offset}
                  className="gj-boot-trail"
                  x="1.958"
                  y="1.958"
                  width="196.084"
                  height="61.285"
                  rx="7.6"
                  ry="7.6"
                  pathLength="100"
                  fill="none"
                  stroke="white"
                  strokeOpacity={segment.opacity}
                  strokeWidth={1.5 * segment.width}
                  strokeLinecap="round"
                  strokeDasharray={`${segment.length} ${100 - segment.length}`}
                  strokeDashoffset={-segment.offset}
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from={-segment.offset}
                    to={-segment.offset - 100}
                    dur="2.4s"
                    calcMode="linear"
                    repeatCount="indefinite"
                  />
                </rect>
              ))}
            </svg>
          </div>
          <div id="gj-boot-msg">
            This is taking longer than usual.
            <br />
            <button type="button" data-gj-reload="1">
              Reload
            </button>
          </div>
        </div>

        {/* Watchdog: if React never mounts, retry ONCE automatically, then offer
            a manual reload — rather than leaving a dead black screen. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var K='gj-boot-retry';function ss(){try{return window.sessionStorage}catch(e){return null}}
document.addEventListener('click',function(e){var t=e.target;if(t&&t.getAttribute&&t.getAttribute('data-gj-reload')){location.reload()}},true);
setTimeout(function(){if(window.__gjBooted)return;var s=ss();var tried=null;try{tried=s&&s.getItem(K)}catch(e){}
if(!tried){try{s&&s.setItem(K,'1')}catch(e){}location.reload();return}
var m=document.getElementById('gj-boot-msg');if(m)m.className='gj-show'},12000)})();`,
          }}
        />

        <noscript>
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 2147483001,
              background: "#0A0A0A",
              color: "#F5F1E6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "2rem",
            }}
          >
            Grandma Jazz — a plastic-free cannabis caf&eacute; in Kamala,
            Phuket.
            <br />
            Please enable JavaScript to view the site, or call +66 94 860 5652.
          </div>
        </noscript>

        <ClientBody>
          <BootHandoff />
          <ConditionalHeader />
          <main className="flex-1" role="main" aria-label="Main content">
            {children}
          </main>
          {/*
            CartDrawer จะถูกรวมในทุกๆ หน้า
            แต่จะแสดงผลเฉพาะเมื่อ isCartOpen ใน CartContext เป็น true
          */}
          <CartDrawer aria-label="Shopping cart" />
        </ClientBody>
      </body>
    </html>
  );
}
