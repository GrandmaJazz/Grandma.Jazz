const PITCH = 272; // Original 240px brick and 32px mortar gap.
const RESUME_AFTER_IDLE = 900; // Same pause as the homepage customer quotes.
const WHEEL_IDLE = 120; // Trackpads already send their own momentum events.
const COAST_DECAY = 600;
const COAST_STOP = .02; // px/ms, close to the wall's slow automatic drift.
const DRIFT_RAMP = 240;
interface WallRecord { id: string; title: string; name: string }
interface Controls { paused: boolean; reducedMotion: boolean; browsable?: boolean; highlightedMemberId?: string | null }

/** A fractional, viewport-sized moving layer over the complete member list. */
export function createWallWindow<T extends WallRecord>(track: HTMLElement, members: T[], options: {
  direction: "left" | "right"; pixelsPerSecond: number;
  controls: () => Controls; artwork: (member: T) => string;
  turn?: (node: HTMLElement, member: T) => {flip: () => void; destroy: () => void};
}): () => void {
  const space = track.parentElement!, row = space.parentElement!;
  let first = -1, count = 0, segment = 0, frame = 0, lastTime = 0;
  let position = 0, nativePosition = 0, paintedOffset = NaN, paintedAnchor = NaN;
  let userScrolling = false, pointerDown = false, resumeAt = 0, driftVelocity = 0;
  let drag: { id: number; x: number; position: number; lastTime: number; velocity: number; samples: {x: number; time: number}[]; target: EventTarget | null } | null = null;
  let ignoreClickUntil = 0;
  let coastVelocity = 0;
  let touchId: number | null = null;
  let compositor: { animation: Animation; from: number; velocity: number } | null = null;
  let canAnimate = typeof track.animate === "function";
  const turns = new Map<HTMLElement, {flip: () => void; destroy: () => void}>();
  const artwork = new Map<string, string>();
  let suppressTap = false, lastBrowsable: boolean | undefined;
  const release = (node: HTMLElement) => { turns.get(node)?.destroy(); turns.delete(node); };
  let lastHighlight: string | null | undefined;
  const memberAt = (index: number) => members[((index % members.length) + members.length) % members.length];
  const fill = (node: HTMLElement, index: number) => {
    release(node);
    const member = memberAt(index);
    node.className = "family-badge family-wall-brick"; node.dataset.memberId = member.id;
    // Same escaped SVG artwork as Brick. Membership data is never truncated.
    let svg = artwork.get(member.id);
    if (!svg) { svg = options.artwork(member); artwork.set(member.id, svg); }
    node.innerHTML = svg;
    if (options.turn) { node.setAttribute("role", "button"); node.setAttribute("aria-label", `${member.title} ${member.name} — see when they joined`); node.tabIndex = options.controls().browsable ? 0 : -1; }
    node.classList.toggle("family-brick-highlight", member.id === options.controls().highlightedMemberId);
  };
  const paint = () => {
    const nextFirst = Math.max(0, Math.floor(position / PITCH) - 1);
    if (nextFirst !== first) {
      cancelCompositor();
      const change = nextFirst - first;
      if (first >= 0 && Math.abs(change) < count && track.children.length === count) {
        if (change > 0) for (let i = 0; i < change; i++) {
          const node = track.firstElementChild as HTMLElement;
          fill(node, first + count + i); track.append(node);
        }
        else for (let i = 0; i > change; i--) {
          const node = track.lastElementChild as HTMLElement;
          fill(node, first + i - 1); track.prepend(node);
        }
      } else {
        // Preserve a flipped brick across an invisible logical loop re-centre.
        const available = new Map<string, HTMLElement[]>();
        for (const child of Array.from(track.children) as HTMLElement[]) {
          const id = child.dataset.memberId!;
          available.set(id, [...(available.get(id) || []), child]);
        }
        const nodes = Array.from({ length: count }, (_, i) => {
          const kept = available.get(memberAt(nextFirst + i).id)?.shift();
          if (kept) return kept;
          const node = document.createElement("div"); fill(node, nextFirst + i); return node;
        });
        for (const unused of Array.from(available.values()).flat()) release(unused);
        track.replaceChildren(...nodes);
      }
      first = nextFirst;
    }
    // Native scroll coordinates can be pixel-rounded. Keep their anchor still
    // during drift/drag/coast, and move only this small layer at full precision.
    // Recycled artwork resets the local offset without moving any visible brick.
    if (paintedAnchor !== nativePosition) { track.style.left = `${nativePosition}px`; paintedAnchor = nativePosition; }
    const offset = first * PITCH - position;
    if (!compositor && offset !== paintedOffset) { track.style.transform = `translate3d(${offset}px,0,0)`; paintedOffset = offset; }
  };
  const cancelCompositor = (sync = false) => {
    if (!compositor) return;
    const run = compositor, elapsed = run.animation.currentTime;
    if (sync && typeof elapsed === "number") browseTo(run.from + run.velocity * elapsed);
    run.animation.cancel(); compositor = null; paintedOffset = NaN;
  };
  const startCompositor = (time: number, velocity: number) => {
    try {
      const from = first * PITCH - position;
      // Two slots of runway let recycling happen before the animation ends,
      // even if a page task misses a frame. The layer remains viewport-sized.
      const distance = Math.sign(velocity) * PITCH * 2;
      const animation = track.animate([
        { transform: `translate3d(${from}px,0,0)` },
        { transform: `translate3d(${from - distance}px,0,0)` },
      ], { duration: Math.abs(distance / velocity), easing: "linear", fill: "forwards" });
      animation.startTime = time;
      compositor = { animation, from: position, velocity };
    } catch { canAnimate = false; }
  };
  const writeAnchor = (anchor: number) => { row.scrollLeft = anchor; nativePosition = row.scrollLeft; };
  const recenter = () => {
    if (nativePosition < segment / 2 || nativePosition > segment * 1.5) {
      // Re-centre the keyboard/focus scroll space, preserving the visible phase.
      writeAnchor(segment + ((nativePosition % segment) + segment) % segment);
    }
  };
  const resize = () => {
    const width = row.clientWidth || window.innerWidth;
    const nextCount = Math.max(3, Math.floor(width / PITCH) + 3);
    if (count === nextCount) return;
    cancelCompositor(true);
    if (drag) cancelInteraction();
    count = nextCount;
    const oldSegment = segment;
    segment = Math.ceil((count + 2) / members.length) * members.length * PITCH;
    space.style.width = `${segment * 3}px`; track.style.width = `${count * PITCH - 32}px`; first = -1;
    position = oldSegment ? segment + ((position % oldSegment) + oldSegment) % oldSegment : segment;
    writeAnchor(segment); paint();
  };
  const pauseForInput = () => {
    if (!options.controls().browsable) return;
    if (compositor) { cancelCompositor(true); paint(); }
    userScrolling = true; driftVelocity = 0; resumeAt = performance.now() + RESUME_AFTER_IDLE;
  };
  const onScroll = () => {
    // Preserve native keyboard/focus scrolling; ordinary motion never writes
    // scrollLeft each frame or races the browser's scroll compositor.
    const delta = row.scrollLeft - nativePosition;
    if (!delta) return;
    pauseForInput(); nativePosition = row.scrollLeft;
    browseTo(position + delta); paint();
  };
  const brickAt = (target: EventTarget | null, x: number, y: number) => {
    const direct = target instanceof Element ? target.closest<HTMLElement>(".family-wall-brick") : null;
    if (direct && row.contains(direct)) return direct;
    return Array.from(track.children).find(node => {
      const rect = node.getBoundingClientRect();
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    }) || target;
  };
  const onDown = (event: Pick<PointerEvent, "button" | "pointerId" | "clientX" | "clientY" | "target">) => {
    // A secondary touch on ANOTHER row is independent. Keep one owner per row
    // so two fingers on the same brick cannot fight over its position.
    if (!options.controls().browsable || drag || event.button !== 0) return;
    suppressTap = false; pointerDown = true; coastVelocity = 0; pauseForInput();
    const now = performance.now();
    drag = { id: event.pointerId, x: event.clientX, position,
      lastTime: now, velocity: 0, samples: [{x: event.clientX, time: now}], target: brickAt(event.target, event.clientX, event.clientY) };
    if (touchId === null) row.setPointerCapture?.(event.pointerId);
    row.dataset.dragging = "true";
  };
  const browseTo = (nextPosition: number) => {
    // Pointer/coast movement can cross a circuit mid-flick. Shift the drag
    // origin equally so the next pointer event stays attached to the finger.
    const wrapped = nextPosition < segment / 2 || nextPosition > segment * 2.5 - row.clientWidth
      ? segment + ((nextPosition % segment) + segment) % segment : nextPosition;
    if (drag) drag.position += wrapped - nextPosition;
    position = wrapped;
  };
  const onMove = (event: Pick<PointerEvent, "pointerId" | "clientX" | "preventDefault">) => {
    if (!drag || event.pointerId !== drag.id || !options.controls().browsable) return;
    const now = performance.now();
    suppressTap ||= Math.abs(event.clientX - drag.x) > 5;
    drag.samples.push({x: event.clientX, time: now});
    while (drag.samples.length > 2 && drag.samples[1].time < now - 80) drag.samples.shift();
    const oldest = drag.samples[0];
    drag.velocity = Math.max(-3, Math.min(3, (oldest.x - event.clientX) / Math.max(8, now - oldest.time)));
    drag.lastTime = now;
    browseTo(drag.position - (event.clientX - drag.x));
    // Several touch events may arrive within one display frame. Draw their
    // latest position once in tick, instead of causing several layout/paints.
    pauseForInput(); event.preventDefault();
  };
  const onUp = (event?: Pick<PointerEvent, "pointerId" | "type">) => {
    if (event && drag && event.pointerId !== drag.id) return;
    pointerDown = false;
    coastVelocity = drag && event?.type !== "pointercancel" && performance.now() - drag.lastTime < 80 && !options.controls().reducedMotion ? drag.velocity : 0;
    const tapped = drag && !suppressTap && event?.type === "pointerup" ? drag.target : null;
    if (drag && touchId === null && row.hasPointerCapture?.(drag.id)) row.releasePointerCapture(drag.id);
    drag = null; delete row.dataset.dragging; pauseForInput();
    // Release hands straight from inertia to drift; only a tapped brick keeps
    // the separate reading pause installed by activate().
    resumeAt = 0;
    // Pointer capture retargets the synthesized click to the row. Commit a
    // real tap on release using its original brick, then ignore that click.
    if (tapped) activate(tapped);
    if (event) ignoreClickUntil = performance.now() + 700;
    touchId = null;
  };
  const cancelInteraction = () => { onUp(); coastVelocity = 0; };
  // WebKit's native overflow recognizer can cancel PointerEvents mid-pan.
  // Touches use a non-passive stream with a per-row identifier; mouse/pen keep
  // pointer capture. Never run both streams for the same finger.
  const onPointerDown = (event: PointerEvent) => { if (event.pointerType !== "touch") onDown(event); };
  const onPointerMove = (event: PointerEvent) => { if (touchId === null && event.pointerType !== "touch") onMove(event); };
  const onPointerUp = (event: PointerEvent) => { if (touchId === null && event.pointerType !== "touch") onUp(event); };
  const onTouchStart = (event: TouchEvent) => {
    if (!options.controls().browsable || drag) return;
    const touch = event.changedTouches[0];
    if (!touch) return;
    touchId = touch.identifier;
    onDown({ button: 0, pointerId: touch.identifier, clientX: touch.clientX, clientY: touch.clientY, target: event.target });
    if (event.cancelable) event.preventDefault();
  };
  const onTouchMove = (event: TouchEvent) => {
    if (touchId === null) return;
    const touch = Array.from(event.changedTouches).find(item => item.identifier === touchId);
    if (!touch) return;
    onMove({ pointerId: touch.identifier, clientX: touch.clientX, preventDefault: () => { if (event.cancelable) event.preventDefault(); } });
  };
  const onTouchEnd = (event: TouchEvent) => {
    if (touchId === null || !Array.from(event.changedTouches).some(item => item.identifier === touchId)) return;
    onUp({ pointerId: touchId, type: event.type === "touchcancel" ? "pointercancel" : "pointerup" });
    if (event.cancelable) event.preventDefault();
  };
  const onWheel = (event: WheelEvent) => {
    if (!options.controls().browsable) return;
    const delta = event.deltaX || (event.shiftKey ? event.deltaY : 0);
    if (!delta) return;
    event.preventDefault();
    if (pointerDown) return;
    coastVelocity = 0;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? row.clientWidth : 1;
    pauseForInput(); browseTo(position + delta * unit);
    // Follow the device's coast without adding a second synthetic fling or
    // the keyboard/focus idle pause after its final wheel event.
    resumeAt = performance.now() + WHEEL_IDLE;
  };
  const activate = (target: EventTarget | null) => {
    if (!options.turn || !options.controls().browsable || !(target instanceof Element)) return false;
    if (compositor) { cancelCompositor(true); paint(); }
    const node = target.closest<HTMLElement>(".family-wall-brick");
    if (!node || !row.contains(node)) return false;
    const member = members.find(item => item.id === node.dataset.memberId);
    if (!member) return false;
    let turn = turns.get(node);
    if (!turn) { turn = options.turn(node, member); turns.set(node, turn); }
    coastVelocity = 0; driftVelocity = 0; userScrolling = true;
    // 600ms reveal, 2.5s readable hold, 600ms return, then gentle drift.
    resumeAt = performance.now() + 4000;
    turn.flip();
    return true;
  };
  const onClick = (event: MouseEvent) => {
    if (performance.now() < ignoreClickUntil) return;
    if (suppressTap && event.detail !== 0) { suppressTap = false; return; }
    suppressTap = false; activate(brickAt(event.target, event.clientX, event.clientY));
  };
  const onKey = (event: KeyboardEvent) => {
    if ((event.key === "Enter" || event.key === " ") && !event.repeat) { activate(event.target); event.preventDefault(); }
    else if (["ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown"].includes(event.key)) pauseForInput();
  };
  const tick = (time: number) => {
    const controls = options.controls();
    const elapsed = lastTime && !document.hidden ? Math.min(time - lastTime, 64) : 0; lastTime = time;
    if (compositor && (controls.paused || controls.reducedMotion || document.hidden)) { cancelCompositor(true); paint(); }
    if (!controls.browsable && (pointerDown || userScrolling)) {
      onUp(); coastVelocity = 0; userScrolling = false;
    }
    if (controls.paused || controls.reducedMotion || document.hidden) coastVelocity = 0;
    let coasting = !pointerDown && Math.abs(coastVelocity) > COAST_STOP;
    let driftElapsed = elapsed;
    if (coasting && controls.browsable && elapsed) {
      // Exact exponential integration keeps release speed continuous and avoids
      // frame-rate-dependent friction. Each row owns its own momentum, so a
      // second finger can flick another row without disturbing this one.
      const remaining = COAST_DECAY * Math.log(Math.abs(coastVelocity) / COAST_STOP);
      const coastElapsed = Math.min(elapsed, remaining);
      const decay = Math.exp(-coastElapsed / COAST_DECAY);
      browseTo(position + coastVelocity * COAST_DECAY * (1 - decay));
      coastVelocity *= decay;
      coasting = remaining > elapsed;
      driftElapsed -= coastElapsed;
      if (!coasting) { driftVelocity = coastVelocity; coastVelocity = 0; }
    }
    if (userScrolling && !pointerDown && !coasting && time >= resumeAt) { recenter(); userScrolling = false; }
    let nativeVelocity: number | null = null;
    if (!controls.paused && !controls.reducedMotion && !userScrolling && elapsed) {
      const target = (options.direction === "left" ? 1 : -1) * options.pixelsPerSecond / 1000;
      if (compositor && typeof compositor.animation.currentTime === "number") {
        browseTo(compositor.from + compositor.velocity * compositor.animation.currentTime);
        driftVelocity = target;
      } else {
        const decay = Math.exp(-driftElapsed / DRIFT_RAMP);
        browseTo(position + target * driftElapsed + (driftVelocity - target) * DRIFT_RAMP * (1 - decay));
        driftVelocity = target + (driftVelocity - target) * decay;
      }
      nativeVelocity = target;
    } else if (controls.paused || controls.reducedMotion || userScrolling) driftVelocity = 0;
    paint();
    if (nativeVelocity !== null && !compositor && canAnimate && Math.abs(driftVelocity - nativeVelocity) < .001) startCompositor(time, nativeVelocity);
    if (options.turn && controls.browsable !== lastBrowsable) {
      lastBrowsable = !!controls.browsable;
      for (const node of Array.from(track.children) as HTMLElement[]) node.tabIndex = lastBrowsable ? 0 : -1;
    }
    if (controls.highlightedMemberId !== lastHighlight) {
      lastHighlight = controls.highlightedMemberId;
      for (const node of Array.from(track.children)) node.classList.toggle("family-brick-highlight", (node as HTMLElement).dataset.memberId === lastHighlight);
    }
    frame = requestAnimationFrame(tick);
  };
  const onVisibility = () => { lastTime = 0; cancelCompositor(true); paint(); if (document.hidden) cancelInteraction(); };
  resize();
  const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize); observer?.observe(row);
  window.addEventListener("resize", resize);
  window.addEventListener("blur", cancelInteraction);
  document.addEventListener("visibilitychange", onVisibility);
  row.addEventListener("scroll", onScroll, { passive: true }); row.addEventListener("wheel", onWheel, { passive: false });
  row.addEventListener("pointerdown", onPointerDown); row.addEventListener("pointermove", onPointerMove);
  row.addEventListener("pointerup", onPointerUp); row.addEventListener("pointercancel", onPointerUp); row.addEventListener("keydown", onKey); row.addEventListener("click", onClick);
  row.addEventListener("touchstart", onTouchStart, { passive: false });
  window.addEventListener("touchmove", onTouchMove, { passive: false });
  window.addEventListener("touchend", onTouchEnd, { passive: false });
  window.addEventListener("touchcancel", onTouchEnd, { passive: false });
  frame = requestAnimationFrame(tick);
  return () => {
    onUp(); cancelCompositor(); cancelAnimationFrame(frame); observer?.disconnect(); window.removeEventListener("resize", resize);
    window.removeEventListener("blur", cancelInteraction);
    document.removeEventListener("visibilitychange", onVisibility);
    row.removeEventListener("scroll", onScroll); row.removeEventListener("wheel", onWheel);
    row.removeEventListener("pointerdown", onPointerDown); row.removeEventListener("pointermove", onPointerMove);
    row.removeEventListener("pointerup", onPointerUp); row.removeEventListener("pointercancel", onPointerUp); row.removeEventListener("keydown", onKey); row.removeEventListener("click", onClick);
    row.removeEventListener("touchstart", onTouchStart); window.removeEventListener("touchmove", onTouchMove);
    window.removeEventListener("touchend", onTouchEnd); window.removeEventListener("touchcancel", onTouchEnd);
    for (const node of Array.from(turns.keys())) release(node);
    track.replaceChildren();
  };
}
