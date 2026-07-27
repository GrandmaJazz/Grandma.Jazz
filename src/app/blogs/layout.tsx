//src/app/blogs/layout.tsx
import type { Metadata } from "next";
import "@/styles/blog.css";

export const metadata: Metadata = {
  title: "Journal — Cannabis, Coffee & Slow Living in Phuket",
  description: "Stories from the world's first plastic-free cannabis café. Notes on cannabis, coffee, jazz and slow mornings in Kamala, Phuket.",
  keywords: "cannabis blog Phuket, cannabis cafe stories, plastic-free cannabis, Kamala Phuket, Thai cannabis culture, Grandma Jazz journal",
  alternates: {
    canonical: "/blogs",
  },
  openGraph: {
    title: "Journal — Cannabis, Coffee & Slow Living in Phuket | Grandma Jazz",
    description: "Stories from the world's first plastic-free cannabis café. Cannabis, coffee, jazz and slow mornings in Kamala, Phuket.",
    url: "https://www.grandmajazz.com/blogs",
    siteName: "Grandma Jazz",
    type: "website",
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Grandma Jazz journal — cannabis, coffee and slow living in Phuket",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@grandma_jazz",
    title: "Journal — Cannabis, Coffee & Slow Living in Phuket | Grandma Jazz",
    description: "Stories from the world's first plastic-free cannabis café in Kamala, Phuket.",
  },
};

export default function BlogsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
