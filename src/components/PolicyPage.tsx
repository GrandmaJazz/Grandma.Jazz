import Link from 'next/link';
import type { ReactNode } from 'react';

export default function PolicyPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return <section className="min-h-screen bg-[#181818] px-5 pb-20 pt-36 text-[#F5F1E6]">
    <div className="mx-auto max-w-3xl font-suisse-intl leading-relaxed">
      <h1 className="font-editorial-ultralight text-4xl sm:text-5xl">{title}</h1>
      <p className="mt-3 text-sm text-[#F5F1E6]/60">Effective 19 October 2026</p>
      <p className="mt-6 text-lg text-[#F5F1E6]/80">{intro}</p>
      <div className="my-8 space-y-8 border-y border-[#F5F1E6]/20 py-8 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:text-[#B49B73] [&_p]:text-[#F5F1E6]/80 [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-[#B49B73]">{children}</div>
      <nav aria-label="Shopping policies" className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#B49B73]">
        <Link href="/shipping/">Delivery</Link><Link href="/returns/">Returns</Link><Link href="/terms/">Shopping terms</Link><Link href="/privacy/">Privacy &amp; cookies</Link><Link href="/products/">Back to the shop</Link>
      </nav>
    </div>
  </section>;
}
