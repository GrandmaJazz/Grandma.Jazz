'use client';

import { useRef } from 'react';
import Image from '@/components/ResponsiveImage';
import Link from 'next/link';
import FounderPortraits from '@/components/FounderPortraits';
import { motion, useScroll, useTransform } from 'framer-motion';
import { SPOTIFY_PLAYLIST_URL, WHATSAPP_URL } from '@/lib/businessDetails';
import styles from './ProductStory.module.css';

type StoryKind = 'space' | 'story' | 'ritual';

const stories = {
  space: {
    eyebrow: 'The Space', title: <><span className="gj-title-accent">Come</span> in. Stay a while.</>,
    highlight: 'take the music with you',
    copy: "Some afternoons are quiet. Others find their way into music, laughter and conversations between people who’ve only just met.\n\nThere’s usually something playing in the background. And when you can’t be here, you can always take the music with you.",
    image: '/images/exterior.webp', alt: "Grandma Jazz entrance, with the full name visible on the sign and Kamala hills behind",
    href: 'https://www.instagram.com/grandmajazzphuket/', cta: 'See life at Grandma’s', background: '#181818',
  },
  story: {
    eyebrow: 'Our Story', title: <>It started <span className="gj-title-accent">with</span> two words.</>,
    highlight: 'welcome, seen and cared for',
    copy: 'Grandma honours the people who came before us. Jazz is the ensemble made by everyone who walks through the door.\n\nWe built this place in 2023 around both ideas — to make people feel welcome, seen and cared for.',
    image: '/images/ac-joy-painted-portraits.webp', alt: 'Painted portraits of Grandma Jazz founders AC and Joy',
    href: '/blogs/why-grandma-jazz-exists-a-quiet-caf-built-on-care-community-and-inclusion/', cta: 'Why Grandma Jazz exists', background: '#0A0A0A',
  },
  ritual: {
    eyebrow: 'The Counter', title: <>Before the jar, a <span className="gj-title-accent">conversation</span>.</>,
    highlight: 'take the time to listen',
    copy: 'Come for coffee, come with questions, or come knowing exactly what you like.\n\nWe’d rather take the time to listen than rush you into a decision.\n\nCannabis requires a valid prescription. No prescription, no flower.',
    image: '/images/3.webp', alt: 'Cannabis flower in warm light',
    href: WHATSAPP_URL, cta: 'Ask Grandma a question', background: '#0A0A0A',
  },
};

function highlightCopy(paragraph: string, phrase: string) {
  const index = paragraph.indexOf(phrase);
  if (index === -1) return paragraph;
  return <>{paragraph.slice(0, index)}<strong className="gj-copy-highlight">{phrase}</strong>{paragraph.slice(index + phrase.length)}</>;
}

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
          <div className="gj-section-copy mx-auto mt-7 max-w-xl space-y-5 lg:mx-0">{story.copy.split("\n\n").map(paragraph => <p key={paragraph}>{highlightCopy(paragraph, story.highlight)}</p>)}</div>
          <div className="mt-8 flex flex-wrap justify-center gap-4 lg:justify-start">
            <Link href={story.href} className="gj-cta" {...(story.href.startsWith('https://') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
              {story.cta}<span aria-hidden="true">→</span>
            </Link>
            {kind === 'space' && <a href={SPOTIFY_PLAYLIST_URL} target="_blank" rel="noopener noreferrer" className={`gj-cta gj-cta--quiet ${styles.spotifyCta}`}>
              <svg className={`h-5 w-5 shrink-0 ${styles.spotifyIcon}`} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.52 17.34c-.24.36-.66.48-1.02.24-2.82-1.74-6.36-2.1-10.56-1.14-.42.12-.78-.18-.9-.54-.12-.42.18-.78.54-.9 4.56-1.02 8.52-.6 11.64 1.32.42.18.48.66.3 1.02zm1.44-3.3c-.3.42-.84.6-1.26.3-3.24-1.98-8.16-2.58-11.94-1.38-.48.12-1.02-.12-1.14-.6-.12-.48.12-1.02.6-1.14C9.6 9.9 15 10.56 18.72 12.84c.36.18.54.78.24 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.3c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.72 1.62.54.3.72 1.02.42 1.56-.3.42-1.02.6-1.56.3z" /></svg>
              Play Grandma’s Groove<span aria-hidden="true">→</span>
            </a>}
          </div>
        </div>
      </div>
    </section>
  );
}
