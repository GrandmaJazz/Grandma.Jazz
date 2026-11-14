'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

export default function GarmentsTeaser() {
  const [touchPressed, setTouchPressed] = useState(false);

  return (
    <section aria-labelledby="garments-teaser-title" className="px-6 pt-2 pb-14 text-center sm:pt-4 sm:pb-20">
      <h2 id="garments-teaser-title" className="gj-section-title text-balance">
        Who wore it <span className="gj-title-accent">before</span> you?
      </h2>
      <p className="gj-section-copy mx-auto mt-3 max-w-sm text-pretty">
        In <strong className="gj-copy-highlight">Garments</strong>, Joy shares the stories behind her vintage and reworked finds.
      </p>
      <Link
        href="/garments/"
        prefetch={false}
        aria-label="Garments newsstand"
        data-touch-pressed={touchPressed}
        onPointerDown={(event) => {
          if (event.pointerType === 'touch' && event.isPrimary) setTouchPressed(true);
        }}
        onPointerUp={() => setTouchPressed(false)}
        onPointerCancel={() => setTouchPressed(false)}
        className="gj-cta group mt-5 [&:is(:active,[data-touch-pressed=true])]:[background-color:var(--gj-button-hover-bg)] [&:is(:active,[data-touch-pressed=true])]:[border-color:var(--gj-button-hover-border)]"
      >
        <Image
          src="/images/garments.png"
          alt=""
          width={1031}
          height={218}
          className="h-5 w-auto sm:h-6 group-active:brightness-0 group-data-[touch-pressed=true]:brightness-0 [@media(hover:hover)]:group-hover:brightness-0 motion-safe:transition-[filter] motion-safe:duration-200"
        />
      </Link>
    </section>
  );
}
