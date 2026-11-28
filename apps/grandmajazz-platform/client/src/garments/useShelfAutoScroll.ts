import { useEffect, useRef } from "react";
import { shelfAutoStep } from "./navigation";

/** Drive the rendered shelf, never the open catalogue or the outer page. */
export function useShelfAutoScroll(root: React.RefObject<HTMLDivElement | null>, enabled: boolean, step: (pixels: number) => void) {
  const latest = useRef(step); latest.current = step;
  useEffect(() => {
    if (!enabled) return;
    let frame = 0, previous = 0, velocity = 0;
    let resumeAt = performance.now() + 2500;
    let held = false;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const pause = () => { resumeAt = performance.now() + 3000; velocity = 0; previous = 0; };
    const down = () => { held = true; pause(); };
    const up = () => { held = false; pause(); };
    const tick = (now: number) => {
      const dt = previous ? (now - previous) / 1000 : 0; previous = now;
      const blocked = document.hidden || held || now < resumeAt ||
        (window.visualViewport?.scale ?? 1) > 1.01 || !!document.querySelector('[aria-modal="true"]') ||
        !!root.current?.querySelector('details[open]') || !!window.getSelection()?.toString() ||
        !!document.activeElement?.matches('input, textarea, select, [contenteditable=true]') ||
        !!document.activeElement?.closest('.garments-fallback-list');
      const next = shelfAutoStep(velocity, dt, blocked);
      velocity = next.velocity;
      if (next.pixels) latest.current(next.pixels);
      frame = requestAnimationFrame(tick);
    };
    const schedule = () => {
      cancelAnimationFrame(frame); held = false; pause();
      if (!media.matches) frame = requestAnimationFrame(tick);
    };
    const blur = () => { held = false; pause(); };
    const element = root.current;
    element?.addEventListener('wheel', pause, { passive: true });
    element?.addEventListener('pointerdown', down, { passive: true });
    element?.addEventListener('touchstart', down, { passive: true });
    window.addEventListener('pointerup', up, { passive: true });
    window.addEventListener('pointercancel', up, { passive: true });
    window.addEventListener('touchend', up, { passive: true });
    window.addEventListener('touchcancel', up, { passive: true });
    element?.addEventListener('keydown', pause);
    document.addEventListener('visibilitychange', blur);
    window.addEventListener('blur', blur);
    media.addEventListener('change', schedule);
    if (!media.matches) frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      element?.removeEventListener('wheel', pause); element?.removeEventListener('pointerdown', down);
      element?.removeEventListener('touchstart', down); element?.removeEventListener('keydown', pause);
      window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      window.removeEventListener('touchend', up); window.removeEventListener('touchcancel', up);
      document.removeEventListener('visibilitychange', blur); window.removeEventListener('blur', blur); media.removeEventListener('change', schedule);
    };
  }, [enabled, root]);
}
