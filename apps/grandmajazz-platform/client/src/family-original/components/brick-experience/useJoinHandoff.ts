import { useCallback, useLayoutEffect, useRef, useState } from 'react';

// Keep keyboard dismissal and the form/reel layout change out of the visible
// animation. Only opacity changes while the outgoing form is on screen.
export function useJoinHandoff() {
  const [phase, setPhase] = useState<'form' | 'submitting' | 'leaving' | 'welcome'>('form');
  const formLayer = useRef<HTMLDivElement>(null);
  const held = useRef(false);
  const frozen = useRef<{element:HTMLElement;style:string|null}[]>([]);
  const lastResize = useRef(0);
  const fadeStarted = useRef(0);
  const stopTracking = useRef(() => {});
  const hold = useCallback(() => {
    if (held.current || !formLayer.current) return;
    held.current = true;
    fadeStarted.current = performance.now();
    // Cover the live wall and fade the form at the click, before either request
    // or keyboard dismissal. The same opaque cover stays through reel preparation.
    setPhase('submitting');
    const element = formLayer.current, bounds = element.getBoundingClientRect();
    const regions = Array.from(element.querySelectorAll<HTMLElement>('.brick-heading,.brick-host,.brick-form-bottom,.brick-secondary-actions'))
      .map(region => ({element:region,style:region.getAttribute('style'),bounds:region.getBoundingClientRect()}));
    element.style.width = `${bounds.width}px`;
    element.style.height = `${bounds.height}px`;
    // Pin the four visible regions too: a viewport breakpoint or an unfinished
    // editor transition must not reposition the brick while it fades away.
    for (const region of regions) {
      const {x,y,width,height} = region.bounds;
      Object.assign(region.element.style,{position:'fixed',left:`${x}px`,top:`${y}px`,width:`${width}px`,height:`${height}px`,bottom:'auto',transform:'none',translate:'none',transition:'none'});
    }
    frozen.current = regions;
    const resized = () => { lastResize.current = performance.now(); };
    resized();
    window.addEventListener('resize', resized);
    window.visualViewport?.addEventListener('resize', resized);
    stopTracking.current = () => {
      window.removeEventListener('resize', resized);
      window.visualViewport?.removeEventListener('resize', resized);
    };
  }, []);
  const restore = useCallback(() => {
    held.current = false;
    stopTracking.current();
    formLayer.current?.style.removeProperty('width');
    formLayer.current?.style.removeProperty('height');
    for (const {element,style} of frozen.current) {
      if (style===null) element.removeAttribute('style'); else element.setAttribute('style',style);
    }
    frozen.current = [];
    setPhase('form');
  }, []);
  const begin = useCallback(() => { hold(); setPhase('leaving'); }, [hold]);

  useLayoutEffect(() => {
    if (phase !== 'leaving') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();
    let frame = 0, stableFrames = 0;
    const tick = (now: number) => {
      // Two stable frames after the fade let Safari finish resizing its visual
      // viewport. A bound also guarantees progress if browser chrome keeps moving.
      const quiet = now - lastResize.current >= 100;
      stableFrames = quiet ? stableFrames + 1 : 0;
      if (reduced || (now - fadeStarted.current >= 200 && stableFrames >= 2) || now - start >= 700) {
        stopTracking.current();
        frozen.current = [];
        setPhase('welcome');
      } else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase]);
  useLayoutEffect(() => () => stopTracking.current(), []);
  return { phase, formLayer, hold, restore, begin };
}
