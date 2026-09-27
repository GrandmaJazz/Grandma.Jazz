import Image from 'next/image';

const founders = [
  { name: 'Ac', year: '1988', country: 'United Kingdom', image: '/images/ac-painted-portrait.webp' },
  { name: 'Joy', year: '1996', country: 'Thailand', image: '/images/joy-painted-portrait.webp' },
];

/** Keep the original card labels separate from the replaceable photographs. */
export default function FounderPortraits() {
  return (
    <div className="grid grid-cols-2 gap-[2%] h-full w-full">
      {founders.map(({ name, year, country, image }) => (
        <figure key={name} className="flex min-h-0 flex-col rounded-[5%] bg-black px-[3%] py-[3%] text-[#e3dcd4]">
          <figcaption className="flex shrink-0 border-y border-[#e3dcd4]/70 font-sans text-[clamp(10px,1.6vw,24px)] font-normal leading-tight">
            <span className="w-[55%] py-[3%]">ESTB.{year}</span>
            <span className="flex-1 border-l border-[#e3dcd4]/70 py-[3%] pl-[5%]">{name}</span>
          </figcaption>
          <div className="relative my-[2%] min-h-0 flex-1 overflow-hidden">
            <Image src={image} alt={`Painted portrait of ${name}`} fill sizes="(max-width: 1024px) 42vw, 25vw" className="object-cover object-top" />
          </div>
          <div className="shrink-0 text-center font-sans text-[clamp(7px,1vw,16px)] tracking-[0.18em] uppercase">
            {country}
          </div>
        </figure>
      ))}
    </div>
  );
}
