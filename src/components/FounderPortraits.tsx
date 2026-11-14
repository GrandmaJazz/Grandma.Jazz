'use client';

import { useRef } from 'react';
import { useLogoPulse } from '../../shared/site/useLogoPulse';
import PortraitSmirk from './PortraitSmirk';

const founders = [
  {
    name: 'Ac', year: '1988', country: 'United Kingdom', image: '/images/ac-portrait-full-bleed.webp',
    smirk: {
      seam: [533, 412],
      sides: [
        { corner: [478, 422], spread: 7, lift: 17, cheek: [466, 388], cheekLift: 8 },
        { corner: [590, 409], spread: 9, lift: 15, cheek: [611, 371], cheekLift: 10 },
      ],
    },
  },
  {
    name: 'Joy', year: '1996', country: 'Thailand', image: '/images/joy-portrait-full-bleed.webp',
    smirk: {
      seam: [654, 469],
      sides: [
        { corner: [607, 476], spread: 8, lift: 19, cheek: [588, 392], cheekLift: 12 },
        { corner: [694, 476], spread: 6, lift: 16, cheek: [706, 396], cheekLift: 7 },
      ],
    },
  },
] as const;

function FounderCard({ founder, pulse }: { founder: typeof founders[number]; pulse: string | undefined }) {
  const { name, year, country, image, smirk } = founder;
  const portrait = useRef<HTMLImageElement>(null);
  return (
    <figure className="flex min-h-0 flex-col overflow-hidden rounded-box border-[1.5px] border-[#e3dcd4]/65 bg-black px-[3%] py-[3%] font-sans tracking-[.055em] text-[#e3dcd4]">
      <figcaption className="flex shrink-0 items-baseline justify-between gap-1 text-[clamp(14px,2vw,26px)] leading-tight">
        <span>{name}</span>
        <time dateTime={year} className="text-[clamp(12px,1.25vw,17px)] tabular-nums">{year.slice(0, 2)}<span className="gj-portrait-year" data-pulse={pulse}>{year.slice(2)}</span></time>
      </figcaption>
      <div className="relative my-[2%] overflow-hidden rounded-box bg-black">
        <img ref={portrait} src={image} alt={`Painted portrait of ${name}`} width={1086} height={1448} decoding="async" className="block h-auto w-full rounded-box" />
        <PortraitSmirk image={portrait} geometry={smirk} pulse={pulse} />
      </div>
      <div className="shrink-0 text-center text-[clamp(12px,1.4vw,18px)]">
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
