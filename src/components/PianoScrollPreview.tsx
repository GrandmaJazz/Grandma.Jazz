'use client';

import { useEffect, useRef, useState } from 'react';
import { pianoFrame, PIANO_ATLAS } from '@/lib/pianoPreview';

export default function PianoScrollPreview() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const runway = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'still' | 'unavailable'>('loading');

  useEffect(() => {
    const el = canvas.current, rail = runway.current, stage = scene.current;
    if (!el || !rail || !stage) return;
    const context = el.getContext('2d', { alpha: false });
    if (!context) { setStatus('unavailable'); return; }
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let active = true, frame = 0, last = -1, failed = false;
    let images: HTMLImageElement[] | undefined;
    let loading: Promise<HTMLImageElement[]> | undefined;
    const update = () => {
      if (!frame && images && !document.hidden && !motion.matches) frame = requestAnimationFrame(draw);
    };
    function draw() {
      frame = 0;
      if (!images || motion.matches || document.hidden) return;
      const distance = Math.max(1, rail!.offsetHeight - stage!.offsetHeight);
      const next = pianoFrame(-rail!.getBoundingClientRect().top / distance);
      if (next.index === last) return;
      context!.drawImage(images[next.sheet], next.x, next.y, PIANO_ATLAS.width, PIANO_ATLAS.height,
        0, 0, PIANO_ATLAS.width, PIANO_ATLAS.height);
      // Expose the rendered frame index for touch/reverse regression checks.
      el!.dataset.frame = String(next.index);
      last = next.index;
      if (el!.style.visibility !== 'visible') el!.style.visibility = 'visible';
    }
    const sync = () => {
      if (motion.matches) {
        el.style.visibility = 'hidden';
        last = -1;
        setStatus('still');
        return;
      }
      if (failed) { setStatus('unavailable'); return; }
      if (images) { setStatus('ready'); update(); return; }
      if (loading) { setStatus('loading'); return; }
      setStatus('loading');
      loading = Promise.all(Array.from({ length: PIANO_ATLAS.count }, (_, i) => {
        const sheet = new Image();
        sheet.src = `/videos/quiz-piano-frames-v1-${i + 1}.webp`;
        return sheet.decode().then(() => sheet);
      }));
      void loading.then(sheets => {
        if (!active) return;
        images = sheets;
        sync();
      }).catch(() => {
        if (!active) return;
        failed = true;
        sync();
      });
    };
    motion.addEventListener('change', sync);
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    document.addEventListener('visibilitychange', update);
    sync();
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      motion.removeEventListener('change', sync);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  return (
    <main aria-label="Piano scroll preview" className="bg-[#181818] text-center text-[#f5f1e6]">
      <div ref={runway} className="min-h-[180svh]">
        <div ref={scene} className="sticky top-0 flex min-h-[100svh] flex-col items-center justify-center gap-5 px-5 py-6 sm:gap-6">
          <div>
            <p className="mb-2 font-label-mono text-xs tracking-[0.23em] text-[#b49b73]">THE SESSIONS</p>
            <h1 className="gj-display-title">Play it <span className="gj-title-accent">back.</span></h1>
          </div>
          <div className="relative isolate aspect-[384/434] w-full max-w-[min(100%,48svh)] overflow-hidden rounded-box bg-[#181818] [clip-path:inset(0_round_7.5px)]">
            <div role="img" aria-label="Hands playing a piano in black and white"
              className="absolute -inset-1 bg-[url('/videos/quiz-sessions-poster.webp')] bg-cover bg-center">
              <canvas ref={canvas} width={PIANO_ATLAS.width} height={PIANO_ATLAS.height} aria-hidden="true"
                className="block h-full w-full object-cover" style={{ visibility: 'hidden' }} />
            </div>
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-box bg-black/20 [box-shadow:inset_0_0_0_1px_#181818,inset_0_0_4px_1px_#181818]" />
          </div>
          <p role="status" className="min-h-[2.5em] font-label-mono text-xs tracking-wide text-[#d4cec4] sm:text-sm">
            {status === 'ready' ? 'Scroll down to play · Scroll up to rewind' :
              status === 'still' ? 'Still image for reduced motion' :
              status === 'unavailable' ? 'The piano frames couldn’t load. Try reloading.' : 'Loading the piano…'}
          </p>
        </div>
      </div>
      <p className="px-5 pb-12"><a href="/#event-booking" className="gj-cta gj-cta--quiet">Back to Grandma Jazz</a></p>
    </main>
  );
}
