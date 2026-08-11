// src/app/family/page.tsx
//
// Server Component (no 'use client') — this page is server-rendered so its
// real content and metadata are in the initial HTML that Googlebot receives.
// This is what fixes the previous Soft 404: the old version was a client-only
// component whose meaningful content only appeared after JS ran, so crawlers
// saw an empty shell. Now there's genuine indexable copy plus proper metadata,
// and the interactive Family Wall is embedded via the JoinFamily client
// component below.

import type { Metadata } from 'next';
import { Footer } from '@/components/Footer';
import JoinFamily from '@/components/JoinFamily';

export const metadata: Metadata = {
  title: 'Join the Family | Grandma Jazz',
  description:
    'Everyone who walks through Grandma Jazz becomes part of the family. Add your name to the wall at our plastic-free cannabis café in Kamala, Phuket, and hear first about live nights and quiz sessions.',
  keywords: [
    'Grandma Jazz family',
    'join Grandma Jazz',
    'cannabis cafe community Phuket',
    'Kamala Phuket cafe',
    'plastic-free cannabis',
  ],
  alternates: {
    canonical: 'https://www.grandmajazz.com/family/',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    url: 'https://www.grandmajazz.com/family/',
    siteName: 'Grandma Jazz',
    title: 'Join the Family | Grandma Jazz',
    description:
      'Add your name to the wall at Grandma Jazz — the plastic-free cannabis café in Kamala, Phuket — and stay in the loop on live nights and quiz sessions.',
    images: [
      {
        url: 'https://www.grandmajazz.com/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Join the family at Grandma Jazz, Kamala, Phuket',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@grandma_jazz',
    title: 'Join the Family | Grandma Jazz',
    description:
      'Add your name to the wall at Grandma Jazz — the plastic-free cannabis café in Kamala, Phuket.',
    images: ['https://www.grandmajazz.com/images/og-image.jpg'],
  },
};

export default function FamilyPage() {
  return (
    <>
      <main className="min-h-screen bg-[#181818] pt-28 sm:pt-32">
        {/* Server-rendered, indexable intro copy */}
        <section className="container mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <p className="uppercase tracking-[0.25em] text-[#b88c41] text-xs sm:text-sm font-roboto-light mb-4">
              Join the Family
            </p>
            <h1 className="font-silver-garden text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#F5F1E6] leading-[1.05] mb-6">
              Become part of Grandma Jazz
            </h1>
            <p className="text-[#F5F1E6]/70 font-roboto-light text-base sm:text-lg leading-relaxed">
              Everyone who walks through Grandma Jazz becomes part of the family. Our plastic-free
              cannabis café in the hills of Kamala, Phuket, is built on the people who pass through it —
              add your name to the wall below and you&apos;ll be the first to hear about live piano
              nights, quiz sessions, and everything happening at the café.
            </p>
          </div>
        </section>

        {/* Brad's live Family Wall — the black-and-white moving-names experience */}
        <JoinFamily />
      </main>
      <Footer />
    </>
  );
}
