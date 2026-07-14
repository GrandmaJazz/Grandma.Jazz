//src/app/products/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop — Coffee, Grinders & Upcycled Garments",
  description: "Bamboo joint holders, grinders, rolling trays, Phuket-roasted coffee, teas and upcycled garments. Plastic-free goods from Grandma Jazz in Kamala, Phuket.",
  keywords: "bamboo joint holder, plastic-free smoking accessories, Phuket coffee, upcycled garments Phuket, cannabis accessories Thailand, Grandma Jazz shop",
  alternates: {
    canonical: "/products",
  },
  openGraph: {
    title: "Shop — Coffee, Grinders & Upcycled Garments | Grandma Jazz",
    description: "Bamboo joint holders, grinders, rolling trays, Phuket-roasted coffee, teas and upcycled garments. Plastic-free, made with care in Kamala, Phuket.",
    url: "https://grandmajazz.com/products",
    siteName: "Grandma Jazz",
    type: "website",
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Plastic-free goods from Grandma Jazz, Kamala, Phuket",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@grandma_jazz",
    title: "Shop — Coffee, Grinders & Upcycled Garments | Grandma Jazz",
    description: "Bamboo joint holders, grinders, coffee and upcycled garments. Plastic-free, from Kamala, Phuket.",
  },
};

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
