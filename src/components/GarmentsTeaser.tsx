import Image from 'next/image';
import Link from 'next/link';

export default function GarmentsTeaser() {
  return (
    <section aria-labelledby="garments-teaser-title" className="px-6 pb-16 sm:pb-24">
      <div className="mx-auto grid max-w-4xl grid-cols-[clamp(3.5rem,19vw,5.5rem)_minmax(0,1fr)] items-center gap-x-4 gap-y-4 rounded-xl border border-[#B49B73]/30 bg-[#161310] p-4 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-x-7 sm:p-6 lg:grid-cols-[7rem_minmax(0,1fr)_auto] lg:gap-x-8">
        <Image
          src="/images/garments-newsstand-cover.webp"
          alt=""
          width={320}
          height={427}
          className="h-auto w-full rounded-sm border border-[#F5F1E6]/20 shadow-md sm:row-span-2 lg:row-span-1"
        />
        <div>
          <p className="mb-2 font-label-mono text-xs uppercase tracking-[0.18em] text-[#B49B73]">Garments</p>
          <h2 id="garments-teaser-title" className="gj-section-title">
            Good clothes have another <span className="gj-title-accent">chapter.</span>
          </h2>
          <p className="gj-section-copy mt-3 max-w-md">
            Joy curates <strong className="gj-copy-highlight">vintage and reworked clothes</strong> in Kamala. Our digital magazine tells the stories behind them.
          </p>
        </div>
        <Link href="/garments/" prefetch={false} className="gj-cta gj-cta--quiet col-span-2 sm:col-span-1 sm:justify-self-start">
          Visit the newsstand <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
