import { Inter, Playfair_Display, Space_Mono } from "next/font/google";

// Temporary replacement for Suisse International Regular
export const suisseIntl = Inter({
  subsets: ["latin"],
  variable: "--font-suisse-intl",
  display: "swap",
});

// Temporary replacement for Suisse International Mono
export const suisseIntlMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-suisse-intl-mono",
  display: "swap",
});

// Temporary replacement for PP Editorial Old Ultralight
export const ppEditorialUltralight = Playfair_Display({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-pp-editorial-ultralight",
  display: "swap",
});

// Temporary replacement for PP Editorial Old Ultralight Italic
export const ppEditorialUltralightItalic = Playfair_Display({
  weight: ["400"],
  style: "italic",
  subsets: ["latin"],
  variable: "--font-pp-editorial-ultralight-italic",
  display: "swap",
});

// Generic fallback fonts (as backup)
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});
