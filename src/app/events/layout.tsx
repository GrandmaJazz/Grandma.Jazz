// src/app/events/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Events",
  description:
    "Free quiz sessions every Saturday at 4:20 pm at Grandma Jazz in Kamala, Phuket. Live music and DJ sessions are occasional; check confirmed dates.",
  keywords:
    "Grandma Jazz events, live music Phuket, jazz nights Kamala, quiz night Phuket, cannabis cafe events Thailand",
  alternates: {
    canonical: "/events/",
  },
  openGraph: {
    title: "Events — Saturday Quiz Sessions | Grandma Jazz",
    description:
      "Free Saturday quiz sessions at 4:20 pm in Kamala, Phuket, plus occasional performances.",
    url: "https://www.grandmajazz.com/events/",
    siteName: "Grandma Jazz",
    type: "website",
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Saturday quiz sessions at Grandma Jazz, Kamala, Phuket",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@grandma_jazz",
    title: "Events — Saturday Quiz Sessions | Grandma Jazz",
    description:
      "Free Saturday quiz sessions at 4:20 pm in Kamala, Phuket.",
  },
};

export default function EventsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

