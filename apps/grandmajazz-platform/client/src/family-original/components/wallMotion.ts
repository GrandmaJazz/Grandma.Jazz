const PITCH = 272; // Original 240px brick and 32px mortar gap.
const RESUME_AFTER_IDLE = 900; // Same pause as the homepage customer quotes.
interface WallRecord { id: string; title: string; name: string }
interface Controls { paused: boolean; reducedMotion: boolean; browsable?: boolean; highlightedMemberId?: string | null }

/** Native scrolling over every member, with only the visible artwork mounted. */
export function createWallWindow<T extends WallRecord>(track: HTMLElement, members: T[], options: {
  direction: "left" | "right"; pixelsPerSecond: number;
  controls: () => Controls; artwork: (member: T) => string;
  turn?: (node: HTMLElement, member: T) => {flip: () => void; destroy: () => void};
}): () => void {
  const space = track.parentElement!, row = space.parentElement!;
  let first = -1, count = 0, segment = 0, frame = 0, lastTime = 0;
  let autoPosition = 0, lastAutoWrite = 0, userScrolling = false, pointerDown = false, resumeAt = 0;
  let drag: { id: number; x: number; position: number; lastX: number; lastTime: number; velocity: number; target: EventTarget | null } | null = null;
  let ignoreClickUntil = 0;
  let coastVelocity = 0;
  const turns = new Map<HTMLElement, {flip: () => void; destroy: () => void}>();
  let suppressTap = false, lastBrowsable: boolean | undefined;
  const release = (node: HTMLElement) => { turns.get(node)?.destroy(); turns.delete(node); };
  let lastHighlight: string | null | undefined;
  const memberAt = (index: number) => members[((index % members.length) + members.length) % members.length];
  const fill = (node: HTMLElement, index: number) => {
    release(node);
    const member = memberAt(index);
    node.className = "family-badge family-wall-brick"; node.dataset.memberId = member.id;
    // Same escaped SVG artwork as Brick. Membership data is never truncated.
    node.innerHTML = options.artwork(member);
    if (options.turn) { node.setAttribute("role", "button"); node.setAttribute("aria-label", `${member.title} ${member.name} — see when they joined`); node.tabIndex = options.controls().browsable ? 0 : -1; }
    node.classList.toggle("family-brick-highlight", member.id === options.controls().highlightedMemberId);
  };
  const paint = () => {
    const nextFirst = Math.max(0, Math.floor(row.scrollLeft / PITCH) - 1);
    if (nextFirst === first) return;
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
      // Preserve a flipped brick across an invisible native scroll re-centre.
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
    // Position a small layer within native scroll space. Never transform a
    // 40,000px strip or start reverse rows far offscreen.
    track.style.left = `${first * PITCH}px`;
  };
  const writePosition = (position: number) => { row.scrollLeft = position; lastAutoWrite = row.scrollLeft; paint(); };
  const recenter = () => {
    const position = row.scrollLeft;
    if (position < segment / 2 || position > segment * 1.5) {
      // Re-centre identical circuits AFTER momentum ends, without changing
      // the names or their visible positions.
      writePosition(segment + ((position % segment) + segment) % segment);
    }
    autoPosition = row.scrollLeft;
  };
  const resize = () => {
    const width = row.clientWidth || window.innerWidth;
    const nextCount = Math.max(3, Math.floor(width / PITCH) + 3);
    if (count === nextCount) return;
    if (drag) cancelInteraction();
    count = nextCount;
    const oldSegment = segment;
    segment = Math.ceil((count + 2) / members.length) * members.length * PITCH;
    space.style.width = `${segment * 3}px`; track.style.width = `${count * PITCH - 32}px`; first = -1;
    writePosition(oldSegment ? segment + ((row.scrollLeft % oldSegment) + oldSegment) % oldSegment : segment);
    autoPosition = row.scrollLeft;
  };
  const pauseForInput = () => {
    if (!options.controls().browsable) return;
    userScrolling = true; resumeAt = performance.now() + RESUME_AFTER_IDLE;
  };
  const onScroll = () => { paint(); if (userScrolling && Math.abs(row.scrollLeft - lastAutoWrite) > 1) pauseForInput(); };
  const onDown = (event: PointerEvent) => {
    // A secondary touch on ANOTHER row is independent. Keep one owner per row
    // so two fingers on the same brick cannot fight over its position.
    if (!options.controls().browsable || drag || event.button !== 0) return;
    suppressTap = false; pointerDown = true; coastVelocity = 0; pauseForInput();
    drag = { id: event.pointerId, x: event.clientX, position: row.scrollLeft,
      lastX: event.clientX, lastTime: performance.now(), velocity: 0, target: event.target };
    row.setPointerCapture?.(event.pointerId); row.dataset.dragging = "true";
  };
  const browseTo = (position: number) => {
    // Pointer/coast movement can cross a circuit mid-flick. Shift the drag
    // origin equally so the next pointer event stays attached to the finger.
    const wrapped = position < segment / 2 || position > segment * 2.5 - row.clientWidth
      ? segment + ((position % segment) + segment) % segment : position;
    if (drag) drag.position += wrapped - position;
    row.scrollLeft = wrapped; paint();
  };
  const onMove = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id || !options.controls().browsable) return;
    const now = performance.now(), elapsed = Math.max(8, now - drag.lastTime);
    const velocity = Math.max(-3, Math.min(3, (drag.lastX - event.clientX) / elapsed));
    suppressTap ||= Math.abs(event.clientX - drag.x) > 5;
    drag.velocity = drag.velocity * .35 + velocity * .65;
    drag.lastX = event.clientX; drag.lastTime = now;
    browseTo(drag.position - (event.clientX - drag.x));
    pauseForInput(); event.preventDefault();
  };
  const onUp = (event?: PointerEvent) => {
    if (event && drag && event.pointerId !== drag.id) return;
    pointerDown = false;
    coastVelocity = drag && event?.type !== "pointercancel" && performance.now() - drag.lastTime < 80 && !options.controls().reducedMotion ? drag.velocity : 0;
    const tapped = drag && !suppressTap && event?.type === "pointerup" ? drag.target : null;
    if (drag && row.hasPointerCapture?.(drag.id)) row.releasePointerCapture(drag.id);
    drag = null; delete row.dataset.dragging; pauseForInput();
    // Pointer capture retargets the synthesized click to the row. Commit a
    // real tap on release using its original brick, then ignore that click.
    if (tapped && activate(tapped)) ignoreClickUntil = performance.now() + 700;
  };
  const cancelInteraction = () => { onUp(); coastVelocity = 0; };
  const activate = (target: EventTarget | null) => {
    if (!options.turn || !options.controls().browsable || !(target instanceof Element)) return false;
    const node = target.closest<HTMLElement>(".family-wall-brick");
    if (!node || !row.contains(node)) return false;
    const member = members.find(item => item.id === node.dataset.memberId);
    if (!member) return false;
    let turn = turns.get(node);
    if (!turn) { turn = options.turn(node, member); turns.set(node, turn); }
    coastVelocity = 0; autoPosition = row.scrollLeft; userScrolling = true;
    // 600ms reveal, 2.5s readable hold, 600ms return, then gentle drift.
    resumeAt = performance.now() + 4000;
    turn.flip();
    return true;
  };
  const onClick = (event: MouseEvent) => {
    if (event.detail !== 0 && performance.now() < ignoreClickUntil) return;
    if (suppressTap && event.detail !== 0) { suppressTap = false; return; }
    suppressTap = false; activate(event.target);
  };
  const onKey = (event: KeyboardEvent) => {
    if ((event.key === "Enter" || event.key === " ") && !event.repeat) { activate(event.target); event.preventDefault(); }
    else if (["ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown"].includes(event.key)) pauseForInput();
  };
  const tick = (time: number) => {
    const controls = options.controls();
    const elapsed = lastTime && !document.hidden ? Math.min(time - lastTime, 64) : 0; lastTime = time;
    if (!controls.browsable && (pointerDown || userScrolling)) {
      onUp(); coastVelocity = 0; userScrolling = false; autoPosition = row.scrollLeft;
    }
    if (!pointerDown && controls.browsable && !controls.reducedMotion && Math.abs(coastVelocity) > .015 && elapsed) {
      // Exact exponential integration keeps release speed continuous and avoids
      // frame-rate-dependent friction. Each row owns its own momentum.
      const decay = Math.exp(-elapsed / 220);
      browseTo(row.scrollLeft + coastVelocity * 220 * (1 - decay));
      coastVelocity *= decay;
      paint(); resumeAt = time + RESUME_AFTER_IDLE;
    }
    if (userScrolling && !pointerDown && time >= resumeAt) { recenter(); userScrolling = false; }
    if (!controls.paused && !controls.reducedMotion && !userScrolling && elapsed) {
      autoPosition += (options.direction === "left" ? 1 : -1) * elapsed * options.pixelsPerSecond / 1000;
      if (autoPosition >= segment * 2) autoPosition -= segment;
      if (autoPosition < segment) autoPosition += segment;
      writePosition(autoPosition);
    }
    paint();
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
  resize();
  const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize); observer?.observe(row);
  window.addEventListener("resize", resize);
  window.addEventListener("blur", cancelInteraction);
  row.addEventListener("scroll", onScroll, { passive: true }); row.addEventListener("wheel", pauseForInput, { passive: true });
  row.addEventListener("pointerdown", onDown); row.addEventListener("pointermove", onMove);
  row.addEventListener("pointerup", onUp); row.addEventListener("pointercancel", onUp); row.addEventListener("keydown", onKey); row.addEventListener("click", onClick);
  frame = requestAnimationFrame(tick);
  return () => {
    onUp(); cancelAnimationFrame(frame); observer?.disconnect(); window.removeEventListener("resize", resize);
    window.removeEventListener("blur", cancelInteraction);
    row.removeEventListener("scroll", onScroll); row.removeEventListener("wheel", pauseForInput);
    row.removeEventListener("pointerdown", onDown); row.removeEventListener("pointermove", onMove);
    row.removeEventListener("pointerup", onUp); row.removeEventListener("pointercancel", onUp); row.removeEventListener("keydown", onKey); row.removeEventListener("click", onClick);
    for (const node of Array.from(turns.keys())) release(node);
    track.replaceChildren();
  };
}
