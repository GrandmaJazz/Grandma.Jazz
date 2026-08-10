// src/app/events/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Events",
  description:
    "Live music, quiz nights and gatherings at Grandma Jazz — the plastic-free cannabis café in the hills of Kamala, Phuket. Reserve your place; your ticket lands in Apple Wallet.",
  keywords:
    "Grandma Jazz events, live music Phuket, jazz nights Kamala, quiz night Phuket, cannabis cafe events Thailand",
  alternates: {
    canonical: "/events",
  },
  openGraph: {
    title: "Events — Live Nights at Grandma Jazz | Grandma Jazz",
    description:
      "Live music, quiz nights and gatherings in the hills of Kamala, Phuket. Reserve your place at Grandma Jazz.",
    url: "https://www.grandmajazz.com/events",
    siteName: "Grandma Jazz",
    type: "website",
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Live nights at Grandma Jazz, Kamala, Phuket",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@grandma_jazz",
    title: "Events — Live Nights at Grandma Jazz | Grandma Jazz",
    description:
      "Live music, quiz nights and gatherings in the hills of Kamala, Phuket.",
  },
};

export default function EventsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
