import Image from 'next/image';
import Link from 'next/link';

export default function GarmentsTeaser() {
  return (
    <section aria-labelledby="garments-teaser-title" className="px-6 pt-2 pb-14 text-center sm:pt-4 sm:pb-20">
      <h2 id="garments-teaser-title" className="gj-section-title text-balance">
        Who wore it <span className="gj-title-accent">before</span> you?
      </h2>
      <p className="gj-section-copy mx-auto mt-3 max-w-sm text-pretty">
        In <strong className="gj-copy-highlight">Garments</strong>, Joy shares the stories behind her vintage and reworked finds.
      </p>
      <Link href="/garments/" prefetch={false} aria-label="Garments newsstand" className="gj-cta group mt-5">
        <Image
          src="/images/garments.png"
          alt=""
          width={1031}
          height={218}
          className="h-5 w-auto sm:h-6 [@media(hover:hover)]:group-hover:brightness-0 motion-safe:transition-[filter] motion-safe:duration-200"
        />
      </Link>
    </section>
  );
}
