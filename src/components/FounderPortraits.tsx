'use client';

import { useRef } from 'react';
import { useLogoPulse } from '../../shared/site/useLogoPulse';
import PortraitSmirk from './PortraitSmirk';

const founders = [
  { name: 'Ac', year: '1988', country: 'United Kingdom', image: '/images/ac-portrait-full-bleed.webp', corner: [586, 402] },
  { name: 'Joy', year: '1996', country: 'Thailand', image: '/images/joy-portrait-full-bleed.webp', corner: [607, 478] },
] as const;

function FounderCard({ founder, pulse }: { founder: typeof founders[number]; pulse: string | undefined }) {
  const { name, year, country, image, corner } = founder;
  const portrait = useRef<HTMLImageElement>(null);
  return (
    <figure className="flex min-h-0 flex-col overflow-hidden rounded-box border-[1.5px] border-[#e3dcd4]/65 bg-black px-[3%] py-[3%] text-[#e3dcd4]">
      <figcaption className="flex shrink-0 items-baseline justify-between gap-1 font-silver-garden text-[clamp(15px,2.4vw,32px)] leading-tight">
        <span className="font-silver-garden">{name}</span>
        <time dateTime={year} className="font-silver-garden text-[0.667em]">{year.slice(0, 2)}<span className="gj-portrait-year font-silver-garden" data-pulse={pulse}>{year.slice(2)}</span></time>
      </figcaption>
      <div className="relative my-[2%] overflow-hidden rounded-box bg-black">
        <img ref={portrait} src={image} alt={`Painted portrait of ${name}`} width={1086} height={1448} decoding="async" className="block h-auto w-full rounded-box" />
        <PortraitSmirk image={portrait} corner={corner} pulse={pulse} />
      </div>
      <div className="shrink-0 text-center font-silver-garden text-[clamp(11px,1.4vw,20px)]">
        {country}
      </div>
    </figure>
  );
}

export default function FounderPortraits() {
  const { group, phase } = useLogoPulse(founders.length);
  return (
    <div ref={group} className="grid w-full grid-cols-2 gap-1.5 sm:gap-2">
      {founders.map((founder, index) => <FounderCard key={founder.name} founder={founder} pulse={phase(index)} />)}
    </div>
  );
}
