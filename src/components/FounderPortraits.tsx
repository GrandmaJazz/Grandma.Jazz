'use client';

import Image from '@/components/ResponsiveImage';
import { useLogoPulse } from '../../shared/site/useLogoPulse';

const founders = [
  { name: 'Ac', year: '1988', country: 'United Kingdom', image: '/images/ac-portrait-full-bleed.webp' },
  { name: 'Joy', year: '1996', country: 'Thailand', image: '/images/joy-portrait-full-bleed.webp' },
];

/** Keep the original card labels separate from the replaceable photographs. */
export default function FounderPortraits() {
  const { group, phase } = useLogoPulse(founders.length);

  return (
    <div ref={group} className="grid w-full grid-cols-2 gap-1.5 sm:gap-2">
      {founders.map(({ name, year, country, image }, index) => (
        <figure key={name} className="flex min-h-0 flex-col overflow-hidden rounded-box border-[1.5px] border-[#e3dcd4]/65 bg-black px-[3%] py-[3%] text-[#e3dcd4]">
          <figcaption className="flex shrink-0 items-baseline justify-between gap-1 font-silver-garden text-[clamp(15px,2.4vw,32px)] leading-tight">
            <time dateTime={year} className="font-silver-garden">{year.slice(0, 2)}<span className="gj-portrait-year font-silver-garden" data-pulse={phase(index)}>{year.slice(2)}</span></time>
            <span className="font-silver-garden">{name}</span>
          </figcaption>
          <div className="relative my-[2%] overflow-hidden rounded-box bg-black">
            <Image src={image} alt={`Painted portrait of ${name}`} width={1086} height={1448} sizes="(max-width: 1024px) 42vw, 25vw" loading="eager" className="block h-auto w-full rounded-box" />
          </div>
          <div className="shrink-0 text-center font-silver-garden text-[clamp(11px,1.4vw,20px)]">
            {country}
          </div>
        </figure>
      ))}
    </div>
  );
}
