'use client';

import { useEffect, useRef, useState } from 'react';

// The next icon starts while the previous one is almost back to gold.
const LOGO_PULSE_MS = 3400;

export function useLogoPulse(iconCount: number) {
  const group = useRef<HTMLDivElement>(null);
  const [pulses, setPulses] = useState<{ current: number; fading: number }>({ current: -1, fading: -1 });
  useEffect(() => {
    if (!group.current) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timer: number | undefined;
    let settle: number | undefined;
    let previous = -1;
    let visible = false;
    const tick = () => {
      const draw = Math.floor(Math.random() * (previous < 0 ? iconCount : iconCount - 1));
      const next = previous >= 0 && draw >= previous ? draw + 1 : draw;
      setPulses({ current: next, fading: previous });
      previous = next;
      settle = window.setTimeout(() => setPulses({ current: next, fading: -1 }), 140);
      timer = window.setTimeout(tick, LOGO_PULSE_MS - 140);
    };
    const sync = () => {
      window.clearTimeout(timer);
      window.clearTimeout(settle);
      if (visible && !preference.matches && !document.hidden) tick();
      else setPulses({ current: -1, fading: -1 });
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    observer.observe(group.current);
    preference.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      observer.disconnect();
      preference.removeEventListener('change', sync);
      document.removeEventListener('visibilitychange', sync);
      window.clearTimeout(timer);
      window.clearTimeout(settle);
    };
  }, [iconCount]);
  const phase = (index: number) => index === pulses.current ? 'current' : index === pulses.fading ? 'fading' : undefined;
  return { group, phase };
}
