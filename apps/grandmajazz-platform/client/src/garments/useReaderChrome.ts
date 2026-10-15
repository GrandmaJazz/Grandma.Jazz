import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { coverFlight, readScreenRect } from "./readerFlight";
import { readerTiming } from "./readerLayout";

export function useReaderChrome(root: RefObject<HTMLElement | null>, active: boolean, reading: boolean, returning = false) {
  const [visible, setVisible] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyboard = useRef(false);
  const exitAnimation = useRef<Animation | null>(null);
  useLayoutEffect(() => {
    if (!returning) return;
    const stage = root.current?.querySelector<HTMLElement>(".garments-stage");
    const host = stage?.querySelector<HTMLElement>(".garments-canvas-host");
    const origin = readScreenRect(host?.dataset.flightOrigin), cover = readScreenRect(host?.dataset.flightCover);
    if (!stage || !origin || !cover || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    exitAnimation.current = stage.animate([
      { transform: "none" },
      { transform: coverFlight(cover, origin, stage.getBoundingClientRect()) },
    ], { duration: readerTiming.returning, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" });
    return () => { exitAnimation.current?.cancel(); exitAnimation.current = null; };
  }, [returning, root]);
  const clear = useCallback(() => { if (timer.current) clearTimeout(timer.current); }, []);
  const show = useCallback(() => {
    clear(); setVisible(true);
    timer.current = setTimeout(() => {
      if (!keyboard.current || !root.current?.querySelector(".garments-reader-tools:focus-within, .garments-reader-top:focus-within")) setVisible(false);
    }, 3000);
  }, [clear, root]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === "Tab") { keyboard.current = true; show(); } };
    const pointer = () => { keyboard.current = false; };
    window.addEventListener("keydown", key); window.addEventListener("pointerdown", pointer, true);
    return () => { window.removeEventListener("keydown", key); window.removeEventListener("pointerdown", pointer, true); };
  }, [show]);
  useEffect(() => { if (active && reading) show(); else { clear(); setVisible(true); } return clear; }, [active, reading, show, clear]);
  useLayoutEffect(() => {
    const element = root.current;
    if (!element || !active) return;
    const stage = element.querySelector<HTMLElement>(".garments-stage");
    const scroll = window.scrollY, overflow = document.body.style.overflow;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    const previousViewport = meta?.content;
    if (meta) meta.content = "width=device-width, initial-scale=1.0, viewport-fit=cover";
    document.body.style.overflow = "hidden";
    element.classList.add("garments-immersive");
    const viewport = () => {
      const v = window.visualViewport;
      element.style.setProperty("--reader-height", `${v?.height || innerHeight}px`);
      element.style.setProperty("--reader-top", `${v?.offsetTop || 0}px`);
    };
    viewport(); window.visualViewport?.addEventListener("resize", viewport); window.visualViewport?.addEventListener("scroll", viewport);
    let entrance: Animation | undefined;
    const host = stage?.querySelector<HTMLElement>(".garments-canvas-host");
    // Fit once at the final viewport before starting a transform-only flight.
    host?.dispatchEvent(new CustomEvent("garments:viewport", { detail: true }));
    const origin = readScreenRect(host?.dataset.flightOrigin), cover = readScreenRect(host?.dataset.flightCover);
    if (stage && origin && cover && !element.matches("dialog") && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      entrance = stage.animate([
        { transform: coverFlight(cover, origin, stage.getBoundingClientRect()) },
        { transform: "none" },
      ], { duration: readerTiming.pickup, easing: "cubic-bezier(.22,.61,.36,1)" });
      entrance.finished.then(() => host?.dispatchEvent(new CustomEvent("garments:viewport", { detail: false }))).catch(() => {});
    }
    return () => {
      entrance?.cancel(); element.classList.remove("garments-immersive");
      element.style.removeProperty("--reader-height"); element.style.removeProperty("--reader-top");
      window.visualViewport?.removeEventListener("resize", viewport); window.visualViewport?.removeEventListener("scroll", viewport);
      document.body.style.overflow = overflow; window.scrollTo({ top: scroll, behavior: "instant" });
      if (meta && previousViewport !== undefined) meta.content = previousViewport;
      host?.dispatchEvent(new CustomEvent("garments:viewport", { detail: false }));
    };
  }, [active, root]);
  return { visible, show, keyboardEntry: () => keyboard.current, toggle: () => { if (visible) { clear(); setVisible(false); } else show(); } };
}
