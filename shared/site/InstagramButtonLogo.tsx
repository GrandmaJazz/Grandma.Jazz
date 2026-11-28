'use client';

import { useId } from 'react';

/** The original homepage Instagram mark, shared by every public button. */
export function InstagramButtonLogo({ size=20, strokeWidth=1.9, className='' }: { size?:number; strokeWidth?:number; className?:string }) {
  const instagramGradient = useId();
  return (
    <svg className={`gj-brand-instagram ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} aria-hidden="true">
              <defs>
                <linearGradient id={instagramGradient} gradientUnits="userSpaceOnUse" x1="4" y1="22" x2="20" y2="2">
                  <stop stopColor="#ffdc80" />
                  <stop offset=".27" stopColor="#f77737" />
                  <stop offset=".52" stopColor="#e1306c" />
                  <stop offset=".76" stopColor="#c13584" />
                  <stop offset="1" stopColor="#833ab4" />
                </linearGradient>
              </defs>
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.6" cy="6.6" r="1" fill="currentColor" stroke="none" />
              <g className="gj-brand-instagram-layer" stroke={`url(#${instagramGradient})`}>
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.6" cy="6.6" r="1" fill={`url(#${instagramGradient})`} stroke="none" />
              </g>
            </svg>
  );
}
