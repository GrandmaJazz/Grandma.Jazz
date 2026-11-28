"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/** One reader for the index and articles; native scrolling keeps links/zoom intact. */
export default function JournalAutoScroll() {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEnabled(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, [pathname]);

  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    let previous = 0;
    let position = window.scrollY;
    let velocity = 0;
    let resumeAt = performance.now() + 2500;
    let touching = false;
    let disposed = false;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pause = () => {
      resumeAt = performance.now() + 3000;
      previous = 0;
      velocity = 0;
      position = window.scrollY;
    };
    const down = () => { touching = true; pause(); };
    const up = () => { touching = false; pause(); };
    const key = (event: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " ", "Tab"].includes(event.key)) pause();
    };
    const stopForReducedMotion = () => { if (reduceMotion.matches) setEnabled(false); };
    const tick = (now: number) => {
      if (disposed) return;
      const dt = previous ? Math.min((now - previous) / 1000, 0.05) : 0;
      previous = now;
      const focused = document.activeElement;
      const blocked = document.hidden || touching || now < resumeAt ||
        Boolean(focused?.matches("input, textarea, select, [contenteditable=true]")) ||
        Boolean(document.querySelector('[aria-modal="true"]')) ||
        [document.body, document.documentElement].some(el => getComputedStyle(el).overflowY === "hidden") ||
        (window.visualViewport?.scale ?? 1) > 1.01 || Boolean(window.getSelection()?.toString());
      if (blocked) {
        position = window.scrollY;
        velocity = 0;
      } else {
        // Keep fractional position; repeatedly adding to rounded scrollY jitters.
        // Exponential easing gives the same gentle pickup at any refresh rate.
        velocity += (18 - velocity) * (1 - Math.exp(-dt / 0.6));
        const content = root.current?.closest("[data-journal-reader]");
        const bottom = content ? content.getBoundingClientRect().bottom + window.scrollY : document.documentElement.scrollHeight;
        const end = Math.max(0, bottom - window.innerHeight);
        if (window.scrollY >= end - 1) {
          setEnabled(false);
          return;
        }
        position = Math.min(position + velocity * dt, end);
        window.scrollTo({ top: position, behavior: "instant" as ScrollBehavior });
      }
      frame = requestAnimationFrame(tick);
    };
    window.addEventListener("wheel", pause, { passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    window.addEventListener("pointercancel", up, { passive: true });
    window.addEventListener("touchstart", down, { passive: true });
    window.addEventListener("touchend", up, { passive: true });
    window.addEventListener("touchcancel", up, { passive: true });
    window.addEventListener("keydown", key);
    document.addEventListener("visibilitychange", pause);
    reduceMotion.addEventListener("change", stopForReducedMotion);
    frame = requestAnimationFrame(tick);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("wheel", pause);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("touchstart", down);
      window.removeEventListener("touchend", up);
      window.removeEventListener("touchcancel", up);
      window.removeEventListener("keydown", key);
      document.removeEventListener("visibilitychange", pause);
      reduceMotion.removeEventListener("change", stopForReducedMotion);
    };
  }, [enabled, pathname]);

  return <div ref={root} className="journal-autoscroll-control">
    <button type="button" className="gj-cta gj-cta--quiet gj-cta--compact"
      aria-label={enabled ? "Pause automatic scrolling" : "Resume automatic scrolling"}
      aria-pressed={enabled} onClick={() => setEnabled(value => !value)}>
      <span aria-hidden="true">{enabled ? "Ⅱ" : "▷"}</span>
      {enabled ? "Pause scroll" : "Auto-scroll"}
    </button>
  </div>;
}
