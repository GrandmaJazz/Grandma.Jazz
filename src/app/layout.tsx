//layout.tsx
import { ClientBody } from "./ClientBody";
import "./globals.css";
import { suisseIntl, suisseIntlMono, ppEditorialUltralight, ppEditorialUltralightItalic, roboto, robotoMono } from "@/lib/fonts";
import ConditionalHeader from "@/components/ConditionalHeader"; // เปลี่ยนจาก Header เป็น ConditionalHeader
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { Toaster } from "react-hot-toast";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Grandma Jazz - Café & Shop",
  description: "Vintage Jazz Cafe and Specialty Shop. Experience premium jazz music, coffee, and unique merchandise.",
  keywords: "jazz cafe, vintage music, vinyl records, bangkok cafe, grandma jazz, coffee shop, live music",
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
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  // Icons
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon.png', type: 'image/png' },
      { url: '/icons/GrandmaJazz.webp', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/icons/GrandmaJazz.webp',
      },
    ],
  },
  
  // Open Graph
  openGraph: {
    title: "Grandma Jazz - Café & Shop",
    description: "Vintage Jazz Cafe and Specialty Shop. Experience premium jazz music, coffee, and unique merchandise.",
    url: "https://grandmajazz.com",
    siteName: "Grandma Jazz",
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Grandma Jazz Cafe",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  
  // Twitter
  twitter: {
    card: "summary_large_image",
    title: "Grandma Jazz - Café & Shop",
    description: "Vintage Jazz Cafe and Specialty Shop",
    images: ["/images/twitter-image.jpg"],
  },
  
  // Additional
  manifest: "/manifest.json",
  
  // Canonical URL
  metadataBase: new URL('https://grandmajazz.com'),
  alternates: {
    canonical: '/',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0A0A0A",
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.gstatic.com" />
        
        {/* Structured Data for Google Search */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Cafe",
              name: "Grandma Jazz",
              description: "Vintage Jazz Cafe and Specialty Shop. Experience premium jazz music, coffee, and unique merchandise.",
              url: "https://grandmajazz.com",
              logo: "https://grandmajazz.com/icons/GrandmaJazz.webp",
              image: "https://grandmajazz.com/images/og-image.jpg",
              address: {
                "@type": "PostalAddress",
                addressCountry: "TH"
              },
              servesCuisine: "Coffee, Beverages",
              priceRange: "$$",
              sameAs: [
                "https://www.instagram.com/grandmajazz",
                "https://www.facebook.com/grandmajazz"
              ]
            })
          }}
        />
      </head>
      <body className={`${suisseIntl.variable} ${suisseIntlMono.variable} ${ppEditorialUltralight.variable} ${ppEditorialUltralightItalic.variable} ${roboto.variable} ${robotoMono.variable} bg-telepathic-black text-white min-h-screen flex flex-col`}>
        <ClientBody>
          <ConditionalHeader />
          <main className="flex-1" role="main" aria-label="Main content">
            {children}
          </main>
          {/* 
            CartDrawer จะถูกรวมในทุกๆ หน้า
            แต่จะแสดงผลเฉพาะเมื่อ isCartOpen ใน CartContext เป็น true 
          */}
          <CartDrawer aria-label="Shopping cart" />
          <Toaster position="top-center" aria-live="polite" />
        </ClientBody>
      </body>
    </html>
  );
}