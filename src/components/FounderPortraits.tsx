import Image from '@/components/ResponsiveImage';

const founders = [
  { name: 'Ac', year: '1988', country: 'United Kingdom', image: '/images/ac-painted-portrait.webp' },
  { name: 'Joy', year: '1996', country: 'Thailand', image: '/images/joy-painted-portrait.webp' },
];

/** Keep the original card labels separate from the replaceable photographs. */
export default function FounderPortraits() {
  return (
    <div className="grid w-full grid-cols-2 gap-1.5 sm:gap-2">
      {founders.map(({ name, year, country, image }) => (
        <figure key={name} className="flex min-h-0 flex-col overflow-hidden rounded-box border-[1.5px] border-[#e3dcd4]/65 bg-black px-[3%] py-[3%] text-[#e3dcd4]">
          <figcaption className="flex shrink-0 border-b border-[#b49b73]/40 font-sans text-[clamp(10px,1.6vw,24px)] font-normal leading-tight">
            <span className="w-[55%] py-[3%]">ESTB.{year}</span>
            <span className="flex-1 border-l border-[#b49b73]/40 py-[3%] pl-[5%]">{name}</span>
          </figcaption>
          <div className="relative my-[2%] overflow-hidden rounded-box bg-black">
            <Image src={image} alt={`Painted portrait of ${name}`} width={1086} height={1448} sizes="(max-width: 1024px) 42vw, 25vw" loading="eager" className="block h-auto w-full rounded-box" />
          </div>
          <div className="shrink-0 text-center font-sans text-[clamp(7px,1vw,16px)] tracking-[0.18em] uppercase">
            {country}
          </div>
        </figure>
      ))}
    </div>
  );
}
