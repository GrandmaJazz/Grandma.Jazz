// Shared physical pace for the quote and product rails.
export const AUTO_SCROLL_PX_PER_SECOND = 62;
const FALLBACK_SETTLE_MS = 48;

/** Native scrolling owns the rail through its last momentum frame. */
export function createRailHandoff(rail: HTMLElement) {
  const hasScrollEnd = 'onscrollend' in rail;
  const pointers = new Set<number>();
  let touching = false, browsing = false, nativeScrolled = false, needsSync = false;
  let lastInput = 0, position = rail.scrollLeft;
  const held = () => touching || pointers.size > 0;
  const begin = () => {
    browsing = true;
    needsSync = true;
    lastInput = performance.now();
    position = rail.scrollLeft;
  };
  const end = () => {
    browsing = nativeScrolled = false;
  };
  const onScroll = () => {
    if (rail.scrollLeft === position) return;
    begin();
    nativeScrolled = true;
  };
  const onScrollEnd = () => {
    onScroll();
    if (!nativeScrolled) return;
    nativeScrolled = false;
    if (!held()) end();
  };
  const down = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    pointers.add(e.pointerId);
    begin();
  };
  const up = (e: PointerEvent) => {
    if (!pointers.delete(e.pointerId)) return;
    begin();
  };
  const touchStart = () => { touching = true; begin(); };
  const touchEnd = (e: TouchEvent) => {
    if (e.targetTouches.length) return;
    touching = false;
    begin();
  };
  const blur = () => { pointers.clear(); touching = false; end(); };
  const onKey = (e: KeyboardEvent) => {
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) begin();
  };
  const passive = { passive: true };
  rail.addEventListener('pointerdown', down, passive);
  rail.addEventListener('touchstart', touchStart, passive);
  rail.addEventListener('touchend', touchEnd, passive);
  rail.addEventListener('touchcancel', touchEnd, passive);
  rail.addEventListener('wheel', begin, passive);
  rail.addEventListener('scroll', onScroll, passive);
  rail.addEventListener('scrollend', onScrollEnd);
  rail.addEventListener('keydown', onKey);
  window.addEventListener('pointerup', up, passive);
  window.addEventListener('pointercancel', up, passive);
  window.addEventListener('blur', blur);

  return {
    ownsPosition(now: number) {
      if (held()) return true;
      // Older browsers lack scrollend. Check a few display frames, extending
      // only while the native scroll position or input is still changing.
      onScroll();
      if (browsing && (!nativeScrolled || !hasScrollEnd) && now - lastInput >= FALLBACK_SETTLE_MS) end();
      return browsing;
    },
    takePosition() {
      if (!needsSync) return;
      needsSync = false;
      return rail.scrollLeft;
    },
    write(left: number) {
      rail.scrollLeft = left;
      position = rail.scrollLeft;
    },
    destroy() {
      rail.removeEventListener('pointerdown', down);
      rail.removeEventListener('touchstart', touchStart);
      rail.removeEventListener('touchend', touchEnd);
      rail.removeEventListener('touchcancel', touchEnd);
      rail.removeEventListener('wheel', begin);
      rail.removeEventListener('scroll', onScroll);
      rail.removeEventListener('scrollend', onScrollEnd);
      rail.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('blur', blur);
    },
  };
}

// Three identical sets keep the same visible card across a native-scroll wrap.
export function wrapRailPosition(position: number, setWidth: number): number {
  if (setWidth <= 0) return position;
  return setWidth + ((position - setWidth) % setWidth + setWidth) % setWidth;
}

/** A small neutral zone makes it easy to stop without lifting a finger. */
export function railDrive(position: number): number {
  const offset = Math.max(-1, Math.min(1, position));
  const amount = Math.max(0, (Math.abs(offset) - 0.06) / 0.94);
  return Math.sign(offset) * amount ** 1.35;
}
