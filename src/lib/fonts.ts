import { Inter, Playfair_Display, Space_Mono, Roboto, Roboto_Mono } from "next/font/google";

// ── Roboto ──────────────────────────────────────────────────────────────────
// CHANGED: was 6 weights (100,300,400,500,700,900) → each weight is a separate
// downloaded file. The site only uses light/regular/bold (font-roboto-light =
// 300 in Header). Trimmed to 3 weights.
export const roboto = Roboto({
  weight: ["300", "400", "700"],
  subsets: ["latin"],
  variable: "--font-roboto",
  display: "swap",
  preload: true,
});

// CHANGED: was 7 weights (100–700). Mono is used sparingly and rarely above the
// fold → trim to one weight and don't preload it.
export const robotoMono = Roboto_Mono({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-roboto-mono",
  display: "swap",
  preload: false,
});

// Primary sans (Inter is a variable font → single file, keep preloaded).
export const suisseIntl = Inter({
  subsets: ["latin"],
  variable: "--font-suisse-intl",
  display: "swap",
  preload: true,
});

// CHANGED: mono display font → don't preload (not needed for first paint).
export const suisseIntlMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-suisse-intl-mono",
  display: "swap",
  preload: false,
});

// Decorative display serif (used for headings). Keep the upright preloaded…
export const ppEditorialUltralight = Playfair_Display({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-pp-editorial-ultralight",
  display: "swap",
  preload: true,
});

// …but the italic variant is decorative-only → don't preload.
export const ppEditorialUltralightItalic = Playfair_Display({
  weight: ["400"],
  style: "italic",
  subsets: ["latin"],
  variable: "--font-pp-editorial-ultralight-italic",
  display: "swap",
  preload: false,
});

// Generic fallback fonts (kept for backwards-compat with any other imports).
// These only download if actually applied via a className somewhere.
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: false,
});

export const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  preload: false,
});
