'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import MagneticButton from '@/components/MagneticButton';
import { FAMILY_WALL_URL } from '@/lib/externalLinks';

// The hero product: the engraved bamboo tube (photo lives at
// /images/4.webp — its dark background blends into the section, so the
// product reads as if it's floating in the same space).
const BAMBOO_PHOTO_SRC = '/images/4.webp';

// The live "Bamboo j holder" product on the store (matched by its _id in the
// Grandma Jazz product API). Update this if the product is ever re-created.
const BAMBOO_PRODUCT_URL = '/products/6929665bbe2f425d5baed3f0';

const noiseTexture = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
  backgroundSize: '150px',
  backgroundRepeat: 'repeat',
};

export default function FeaturedBamboo() {
  const sectionRef = useRef<HTMLDivElement>(null);
  // Gentle parallax on the product as it passes through the viewport.
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] });
  const photoY = useTransform(scrollYProgress, [0, 1], [40, -40]);

  return (
    <section
      ref={sectionRef}
      className="relative w-full bg-[#0A0A0A] overflow-hidden py-20 sm:py-28 lg:py-32"
    >
      <div className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none" style={noiseTexture} />

      <div className="relative max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
        {/* Product photo */}
        <motion.div
          className="w-full lg:w-1/2 flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.94 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ type: 'spring', damping: 26, stiffness: 90 }}
          style={{ willChange: 'transform, opacity' }}
        >
          <motion.div className="relative w-full max-w-[440px] aspect-[4/3]" style={{ y: photoY }}>
            <Image
              src={BAMBOO_PHOTO_SRC}
              alt="The engraved Grandma Jazz bamboo tube — plastic-free, refillable, made to keep."
              fill
              className="object-contain drop-shadow-2xl"
              sizes="(max-width: 1024px) 90vw, 45vw"
              quality={90}
              priority
            />
          </motion.div>
        </motion.div>

        {/* Copy */}
        <motion.div
          className="w-full lg:w-1/2 text-center lg:text-left"
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ type: 'spring', damping: 26, stiffness: 90, delay: 0.1 }}
          style={{ willChange: 'transform, opacity' }}
        >
          <div className="flex items-center justify-center lg:justify-start gap-3">
            <span className="h-px w-8 bg-[#B49B73]" />
            <span className="text-[#B49B73] text-xs sm:text-sm uppercase tracking-[0.25em] font-roboto-light">
              Our Signature Piece
            </span>
          </div>

          <h2 className="font-silver-garden text-5xl sm:text-6xl md:text-7xl xl:text-8xl font-black tracking-tight text-[#F5F1E6] leading-[1.05] mt-4">
            Plastic? Not in Grandma&apos;s house.
          </h2>

          <p className="font-roboto-medium text-base sm:text-lg text-[#e3dcd4]/85 mt-5 leading-relaxed max-w-xl mx-auto lg:mx-0">
            This is the one we&apos;re known for. An engraved bamboo tube, instead of
            the plastic doob tube everyone else hands you. Flower refills into a tin,
            never a baggie — yours to keep, yours to bring back. Plastic-free since
            2023.
          </p>

          <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4 mt-8">
            <MagneticButton>
              <Link
                href={BAMBOO_PRODUCT_URL}
                className="group/buy inline-flex items-center gap-2.5 rounded-full bg-[#B49B73] px-8 py-3.5 text-[#0A0A0A] font-roboto uppercase tracking-wider text-sm shadow-lg transition-transform duration-300 hover:scale-[1.03]"
              >
                Make it yours
                <span className="transition-transform duration-300 ease-out group-hover/buy:translate-x-1" aria-hidden="true">
                  &rarr;
                </span>
              </Link>
            </MagneticButton>

            <a
              href={FAMILY_WALL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#e3dcd4]/70 hover:text-[#B49B73] font-roboto-light text-sm tracking-wide underline underline-offset-4 decoration-[#B49B73]/40 transition-colors"
            >
              Join the movement
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
