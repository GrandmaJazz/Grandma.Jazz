// src/app/family/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join the Family",
  description:
    "Everyone who walks through Grandma Jazz becomes part of the family. Add your name to the wall at our plastic-free cannabis café in Kamala, Phuket, and hear first about live nights and quiz sessions.",
  keywords:
    "Grandma Jazz family, join Grandma Jazz, cannabis cafe community Phuket, Kamala Phuket cafe, plastic-free cannabis",
  alternates: {
    canonical: "/family",
  },
  openGraph: {
    title: "Join the Family | Grandma Jazz",
    description:
      "Add your brick to the wall at Grandma Jazz — the plastic-free cannabis café in Kamala, Phuket — and stay in the loop on live nights and quiz sessions.",
    url: "https://www.grandmajazz.com/family",
    siteName: "Grandma Jazz",
    type: "website",
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Join the family at Grandma Jazz, Kamala, Phuket",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@grandma_jazz",
    title: "Join the Family | Grandma Jazz",
    description:
      "Add your brick to the wall at Grandma Jazz — the plastic-free cannabis café in Kamala, Phuket.",
  },
};

export default function FamilyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
