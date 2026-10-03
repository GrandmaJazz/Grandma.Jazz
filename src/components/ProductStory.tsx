'use client';

import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import FounderPortraits from '@/components/FounderPortraits';
import { motion, useScroll, useTransform } from 'framer-motion';
import { SPOTIFY_PROFILE_URL } from '@/lib/businessDetails';

type StoryKind = 'space' | 'story' | 'ritual';

const stories = {
  space: {
    eyebrow: 'The Space', title: 'Come in. Stay a while.',
    copy: "You're up in the Kamala hills, the noise of the island somewhere below, and the music is something nostalgic you'd half forgotten you loved. Nobody's rushing you out. Stay as long as you want.",
    image: '/images/exterior.webp', alt: "Grandma Jazz entrance, with the full name visible on the sign and Kamala hills behind",
    href: '/visit', cta: 'Find us', background: '#181818',
  },
  story: {
    eyebrow: 'Our Story', title: 'Made with care, darling.',
    copy: 'Joy and I built Grandma Jazz in Kamala in 2023 as a place to sit, listen and belong. The coffee, the music, the flower and the plastic-free details all come back to the same thing: care for the people in the room and the place around us.',
    image: '/images/ac-joy-painted-portraits.webp', alt: 'Painted portraits of Grandma Jazz founders AC and Joy',
    href: '/blogs/why-grandma-jazz-exists-a-quiet-caf-built-on-care-community-and-inclusion/', cta: 'Read our story', background: '#0A0A0A',
  },
  ritual: {
    eyebrow: 'The Ritual', title: 'If you know, you know.',
    copy: 'Good flower and Northern Thai coffee, and no real reason to hurry. Order one, roll the other, and settle in for a bit.',
    image: '/images/3.webp', alt: 'Cannabis flower in warm light',
    href: SPOTIFY_PROFILE_URL, cta: 'Listen with us', background: '#0A0A0A',
  },
};

export default function ProductStory({ kind }: { kind: StoryKind }) {
  const story = stories[kind];
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });
  const photoY = useTransform(scrollYProgress, [0, 1], ['4%', '-4%']);

  return (
    <section ref={sectionRef} id={kind === 'story' ? 'our-story' : `the-${kind}`} className={`w-full px-6 pb-16 sm:px-10 sm:pb-24 lg:pb-28 ${kind === 'space' ? 'pt-10 sm:pt-16 lg:pt-20' : 'pt-16 sm:pt-24 lg:pt-28'}`} style={{ background: story.background }}>
      <div className={`mx-auto flex max-w-7xl flex-col items-center gap-9 lg:gap-14 ${kind === 'story' ? 'lg:flex-row-reverse' : 'lg:flex-row'}`}>
        <div className="w-full lg:w-[55%]">
          <div className={`relative w-full overflow-hidden rounded-box shadow-lg ${kind === 'story' ? 'bg-[#E3DCD4] p-1 sm:p-1.5' : ''}`} style={kind === 'story' ? undefined : { aspectRatio: '16 / 10' }}>
            {kind === 'story' ? <FounderPortraits /> : (
              <motion.div className="absolute -top-[10%] left-0 h-[120%] w-full" style={{ y: photoY }}>
                <Image src={story.image} alt={story.alt} fill className={`object-cover ${kind === 'space' ? 'object-left' : 'object-center'}`} sizes="(max-width: 1024px) 100vw, 55vw" quality={85} priority={kind === 'space'} />
              </motion.div>
            )}
          </div>
        </div>
        <div className="w-full text-center lg:w-[40%] lg:text-left">
          <p className="font-label-mono text-xs uppercase tracking-[.22em] text-[#B49B73] sm:text-sm">{story.eyebrow}</p>
          <h2 className="gj-display-title mt-3">{story.title}</h2>
          <p className="gj-section-copy mx-auto mt-7 max-w-xl lg:mx-0">{story.copy}</p>
          <Link href={story.href} className="gj-cta mt-8" {...(kind === 'ritual' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
            {kind === 'ritual' && <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.52 17.34c-.24.36-.66.48-1.02.24-2.82-1.74-6.36-2.1-10.56-1.14-.42.12-.78-.18-.9-.54-.12-.42.18-.78.54-.9 4.56-1.02 8.52-.6 11.64 1.32.42.18.48.66.3 1.02zm1.44-3.3c-.3.42-.84.6-1.26.3-3.24-1.98-8.16-2.58-11.94-1.38-.48.12-1.02-.12-1.14-.6-.12-.48.12-1.02.6-1.14C9.6 9.9 15 10.56 18.72 12.84c.36.18.54.78.24 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.3c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.72 1.62.54.3.72 1.02.42 1.56-.3.42-1.02.6-1.56.3z" /></svg>}
            {story.cta}<span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
