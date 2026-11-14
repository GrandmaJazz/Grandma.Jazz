// Shared physical pace for the quote and product rails.
export const AUTO_SCROLL_PX_PER_SECOND = 62;
const FALLBACK_SETTLE_MS = 48;

/** Native scrolling owns the rail through its last momentum frame. */
export function createRailHandoff(rail: HTMLElement, onInput?: (nativeDelta: number) => void) {
  const hasScrollEnd = 'onscrollend' in rail;
  const pointers = new Set<number>();
  let touching = false, browsing = false, nativeScrolled = false, needsSync = false;
  let lastInput = 0, position = rail.scrollLeft;
  const held = () => touching || pointers.size > 0;
  const begin = () => {
    onInput?.(rail.scrollLeft - position);
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

/** Drift on one transform timeline, leaving the native scroller to the browser. */
export function attachRailGlide(rail: HTMLElement, track: HTMLElement, cardsPerSet: number) {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let animation: Animation | null = null, period = 0, width = 0;
  let visible = false, frame = 0, supportsAnimation = typeof track.animate === 'function';
  let fallbackPosition = 0, previous = 0;
  const focusNeedsStillness = () => {
    const focus = document.activeElement;
    return !!focus && focus !== rail && rail.contains(focus) && focus.matches(':focus-visible');
  };
  const canRun = () => visible && !document.hidden && !motion.matches && width > 0;
  const stop = (nativeDelta = 0) => {
    if (!animation) return;
    const elapsed = typeof animation.currentTime === 'number' ? animation.currentTime : 0;
    const shift = (elapsed % period) * AUTO_SCROLL_PX_PER_SECOND / 1000;
    animation.cancel();
    animation = null;
    handoff.write(width + shift + nativeDelta);
  };
  const requestTick = () => {
    if (!frame && canRun()) frame = requestAnimationFrame(tick);
  };
  const handoff = createRailHandoff(rail, delta => {
    stop(delta);
    requestTick();
  });
  function tick(now: number) {
    frame = 0;
    if (!canRun() || animation) return;
    if (handoff.ownsPosition(now) || focusNeedsStillness()) {
      previous = 0;
      requestTick();
      return;
    }
    const from = handoff.takePosition() ?? (previous ? fallbackPosition : rail.scrollLeft);
    if (supportsAnimation) {
      const left = wrapRailPosition(from, width);
      handoff.write(width);
      const anchor = rail.scrollLeft;
      period = width * 1000 / AUTO_SCROLL_PX_PER_SECOND;
      // Account for browsers rounding scrollLeft. Keep that remainder on
      // the transform so taking hold never changes the visible card phase.
      const trackOffset = width - anchor;
      try {
        animation = track.animate([
          { transform: `translate3d(${-trackOffset}px,0,0)` },
          { transform: `translate3d(${-width - trackOffset}px,0,0)` },
        ], { duration: period, easing: 'linear', iterations: Infinity });
        animation.currentTime = (left - width) * 1000 / AUTO_SCROLL_PX_PER_SECOND;
        return;
      } catch {
        supportsAnimation = false;
        animation?.cancel();
        animation = null;
        handoff.write(from);
      }
    }
    // Graceful fallback for browsers without the Web Animations API.
    const delta = previous ? Math.min(now - previous, 48) : 0;
    previous = now;
    fallbackPosition = wrapRailPosition(from + AUTO_SCROLL_PX_PER_SECOND * delta / 1000, width);
    handoff.write(fallbackPosition);
    requestTick();
  }
  const sync = () => {
    cancelAnimationFrame(frame);
    frame = previous = 0;
    if (!canRun()) stop();
    else requestTick();
  };
  const measure = () => {
    const first = track.children[0], copy = track.children[cardsPerSet];
    if (!first || !copy) return;
    const next = copy.getBoundingClientRect().left - first.getBoundingClientRect().left;
    if (next <= 0 || next === width) return;
    stop();
    const phase = width ? (wrapRailPosition(rail.scrollLeft, width) - width) / width : 0;
    width = next;
    handoff.write(width * (1 + phase));
    sync();
  };
  const focusChanged = () => {
    if (focusNeedsStillness()) stop();
    requestTick();
  };
  measure();
  const resize = new ResizeObserver(measure);
  resize.observe(rail);
  const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
  visibility.observe(rail);
  rail.addEventListener('focusin', focusChanged);
  rail.addEventListener('focusout', focusChanged);
  document.addEventListener('visibilitychange', sync);
  motion.addEventListener('change', sync);
  return () => {
    stop();
    cancelAnimationFrame(frame);
    handoff.destroy();
    resize.disconnect();
    visibility.disconnect();
    rail.removeEventListener('focusin', focusChanged);
    rail.removeEventListener('focusout', focusChanged);
    document.removeEventListener('visibilitychange', sync);
    motion.removeEventListener('change', sync);
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
