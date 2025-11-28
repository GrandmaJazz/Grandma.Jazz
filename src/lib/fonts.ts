import { Inter, Playfair_Display, Space_Mono, Roboto, Roboto_Mono } from "next/font/google";
// import localFont from "next/font/local";

// Galvji font (if available as Google Font, otherwise use local font)
// Note: Since Galvji is loaded via CSS @import, we'll comment this out for now
/*
export const galvji = localFont({
  src: [
    {
      path: '../fonts/Galvji-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../fonts/Galvji-Light.woff2',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../fonts/Galvji-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-galvji',
  display: 'swap',
  preload: true,
  fallback: ['Inter', 'sans-serif'],
});
*/

// Roboto fonts with optimized loading
export const roboto = Roboto({
  weight: ['100', '300', '400', '500', '700', '900'],
  subsets: ['latin'],
  variable: '--font-roboto',
  display: 'swap',
  preload: true,
});

export const robotoMono = Roboto_Mono({
  weight: ['100', '200', '300', '400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-roboto-mono',
  display: 'swap',
  preload: true,
});

// Temporary replacement for Suisse International Regular
export const suisseIntl = Inter({
  subsets: ["latin"],
  variable: "--font-suisse-intl",
  display: "swap",
  preload: true,
});

// Temporary replacement for Suisse International Mono
export const suisseIntlMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-suisse-intl-mono",
  display: "swap",
  preload: true,
});

// Temporary replacement for PP Editorial Old Ultralight
export const ppEditorialUltralight = Playfair_Display({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-pp-editorial-ultralight",
  display: "swap",
  preload: true,
});

// Temporary replacement for PP Editorial Old Ultralight Italic
export const ppEditorialUltralightItalic = Playfair_Display({
  weight: ["400"],
  style: "italic",
  subsets: ["latin"],
  variable: "--font-pp-editorial-ultralight-italic",
  display: "swap",
  preload: true,
});

// Generic fallback fonts (as backup)
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});
