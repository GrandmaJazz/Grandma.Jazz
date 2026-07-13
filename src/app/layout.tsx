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
  title: {
    default: "Grandma Jazz | Plastic-Free Cannabis Café in Phuket",
    template: "%s | Grandma Jazz",
  },
  description: "The world's first plastic-free cannabis dispensary. A jazz café in Kamala, Phuket — good coffee, mountain views, and cannabis from local Thai farmers.",
  keywords: "cannabis cafe Phuket, plastic-free dispensary, weed cafe Kamala, cannabis dispensary Phuket, jazz cafe Phuket, Kamala cannabis, organic cannabis Thailand, Grandma Jazz",
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
    title: "Grandma Jazz | Plastic-Free Cannabis Café in Phuket",
    description: "The world's first plastic-free cannabis dispensary. A jazz café in Kamala, Phuket — good coffee, mountain views, and cannabis from local Thai farmers.",
    url: "https://grandmajazz.com",
    siteName: "Grandma Jazz",
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Grandma Jazz — cannabis café and plastic-free dispensary in Kamala, Phuket",
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
    title: "Grandma Jazz | Plastic-Free Cannabis Café in Phuket",
    description: "The world's first plastic-free cannabis dispensary. A jazz café in Kamala, Phuket.",
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
              "@type": ["Cafe", "Store"],
              name: "Grandma Jazz",
              alternateName: "Grandma Jazz Cannabis Café",
              description: "The world's first plastic-free cannabis dispensary. A jazz café in Kamala, Phuket, serving organic cannabis from local Thai farmers, Phuket-roasted coffee, and a fully plant-based menu.",
              slogan: "You can't get higher than high.",
              url: "https://grandmajazz.com",
              logo: "https://grandmajazz.com/icons/GrandmaJazz.webp",
              image: "https://grandmajazz.com/images/og-image.jpg",
              telephone: "+66948605652",
              address: {
                "@type": "PostalAddress",
                streetAddress: "13/20 Moo 6",
                addressLocality: "Kamala",
                addressRegion: "Phuket",
                postalCode: "83150",
                addressCountry: "TH"
              },
              geo: {
                "@type": "GeoCoordinates",
                latitude: 8.0136693,
                longitude: 98.3242836
              },
              openingHoursSpecification: [
                {
                  "@type": "OpeningHoursSpecification",
                  dayOfWeek: [
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday"
                  ],
                  opens: "10:00",
                  closes: "20:00"
                }
              ],
              servesCuisine: "Coffee, Tea, Vegan",
              priceRange: "$$",
              currenciesAccepted: "THB",
              paymentAccepted: "Cash, PromptPay, Credit Card",
              sameAs: [
                "https://www.instagram.com/grandmajazzphuket",
                "https://www.facebook.com/Grandmajazzphuket",
                "https://x.com/grandma_jazz"
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
