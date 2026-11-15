// Shared physical pace for the quote and product rails.
export const AUTO_SCROLL_PX_PER_SECOND = 62;
export const RAIL_RAMP_MS = 420;
const RAIL_GLIDE_SPEED = AUTO_SCROLL_PX_PER_SECOND / 1000;
const RAIL_RAMP_EASING = 'cubic-bezier(0.333333, 0, 0.666667, 0.333333)';
const FALLBACK_SETTLE_MS = 48;
const SCROLL_END_BACKSTOP_MS = 160;

export function usesNativeRailGlide(userAgent: string, platform: string, touchPoints: number): boolean {
  // iPadOS can report a Mac user agent. Other browsers on iOS can also use
  // WebKit, so don't key off the Safari brand.
  return /iPhone|iPad|iPod/.test(userAgent) || (platform === 'MacIntel' && touchPoints > 1);
}

// Distance under a linear speed ramp. The last frame has the same speed as
// the steady loop, so neither end of the handoff has a step in velocity.
export function railGlideDistance(elapsed: number, rampMs = RAIL_RAMP_MS): number {
  const t = Math.max(0, elapsed);
  if (rampMs > 0 && t < rampMs) return RAIL_GLIDE_SPEED * t * t / (2 * rampMs);
  return RAIL_GLIDE_SPEED * (t - rampMs / 2);
}

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
      const settleMs = nativeScrolled && hasScrollEnd ? SCROLL_END_BACKSTOP_MS : FALLBACK_SETTLE_MS;
      if (browsing && now - lastInput >= settleMs) end();
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
  let animation: { steady: Animation; ramp?: Animation; from: number; rampMs: number } | null = null;
  let width = 0;
  // Keep iOS on one native scroll layer. Reanchoring a transformed track
  // after native momentum can leave WebKit painting a blank scrollport.
  let visible = false, frame = 0;
  let supportsAnimation = typeof track.animate === 'function'
    && !usesNativeRailGlide(navigator.userAgent, navigator.platform, navigator.maxTouchPoints);
  let fallbackStart: number | null = null, fallbackFrom = 0, fallbackRampMs = 0;
  let lastNativeWrite = 0;
  const focusNeedsStillness = () => {
    const focus = document.activeElement;
    return !!focus && focus !== rail && rail.contains(focus) && focus.matches(':focus-visible');
  };
  const canRun = () => visible && !document.hidden && !motion.matches && width > 0;
  const stop = (nativeDelta = 0) => {
    if (!animation) return;
    const { from, ramp, rampMs, steady } = animation;
    const elapsed = typeof steady.currentTime === 'number' ? steady.currentTime : 0;
    const left = wrapRailPosition(from + railGlideDistance(elapsed, rampMs), width);
    ramp?.cancel();
    steady.cancel();
    animation = null;
    handoff.write(left + nativeDelta);
  };
  const requestTick = () => {
    if (!frame && canRun()) frame = requestAnimationFrame(tick);
  };
  const handoff = createRailHandoff(rail, delta => {
    stop(delta);
    fallbackStart = null;
    requestTick();
  });
  function tick(now: number) {
    frame = 0;
    if (!canRun() || animation) return;
    if (handoff.ownsPosition(now) || focusNeedsStillness()) {
      fallbackStart = null;
      requestTick();
      return;
    }
    const released = handoff.takePosition();
    const from = released ?? rail.scrollLeft;
    const rampMs = released === undefined ? 0 : RAIL_RAMP_MS;
    if (supportsAnimation) {
      const left = wrapRailPosition(from, width);
      handoff.write(width);
      const anchor = rail.scrollLeft;
      const period = width / RAIL_GLIDE_SPEED;
      // Account for browsers rounding scrollLeft. Keep that remainder on
      // the transform so taking hold never changes the visible card phase.
      const trackOffset = width - anchor;
      let ramp: Animation | undefined, steady: Animation | undefined;
      try {
        const rampEnd = left + railGlideDistance(rampMs, rampMs);
        const startTime = document.timeline.currentTime;
        if (rampMs) {
          ramp = track.animate([
            { transform: `translate3d(${anchor - left}px,0,0)` },
            { transform: `translate3d(${anchor - rampEnd}px,0,0)` },
          ], { duration: rampMs, easing: RAIL_RAMP_EASING, fill: 'both' });
        }
        steady = track.animate([
          { transform: `translate3d(${-trackOffset}px,0,0)` },
          { transform: `translate3d(${-width - trackOffset}px,0,0)` },
        ], { duration: period, easing: 'linear', iterations: Infinity, delay: rampMs,
          iterationStart: (wrapRailPosition(rampEnd, width) - width) / width });
        if (startTime !== null) {
          if (ramp) ramp.startTime = startTime;
          steady.startTime = startTime;
        }
        animation = { steady, ramp, from: left, rampMs };
        return;
      } catch {
        supportsAnimation = false;
        ramp?.cancel();
        steady?.cancel();
        handoff.write(from);
      }
    }
    // Keep the same acceleration in native coordinates, including at a loop
    // seam. Don't issue redundant pixel-rounded writes during the ramp.
    if (fallbackStart === null) {
      fallbackStart = now;
      fallbackFrom = from;
      fallbackRampMs = rampMs;
      lastNativeWrite = rail.scrollLeft;
    }
    const left = Math.round(wrapRailPosition(fallbackFrom + railGlideDistance(now - fallbackStart, fallbackRampMs), width));
    if (left !== lastNativeWrite) {
      handoff.write(left);
      lastNativeWrite = left;
    }
    requestTick();
  }
  const sync = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    fallbackStart = null;
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
