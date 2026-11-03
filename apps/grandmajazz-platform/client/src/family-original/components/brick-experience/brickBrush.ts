// Visual feedback only. The title selector retains ownership of taps and swipes.
export function attachBrickBrush(container: HTMLElement, options: {
  selector?: string; enabled?: () => boolean;
} = {}) {
  const selector = options.selector || '[data-title]';
  const enabled = options.enabled || (() => container.closest('[data-title-stage]')?.getAttribute('data-title-stage') === 'choosing');
  const view = container.ownerDocument.defaultView!;
  let lit: HTMLElement | null = null;
  let timer: number | undefined;
  const clear = () => { lit?.removeAttribute('data-brush'); lit = null; };
  const paint = (event: PointerEvent) => {
    if (!enabled()) { clear(); return; }
    if (event.pointerType === 'mouse' && event.buttons === 0) return;
    view.clearTimeout(timer);
    const next = Array.from(container.querySelectorAll<HTMLElement>(selector)).find(button => {
      const r = button.getBoundingClientRect();
      return event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom;
    }) || null;
    if (next === lit) return;
    clear(); lit = next; lit?.setAttribute('data-brush', 'true');
  };
  const release = () => { view.clearTimeout(timer); timer = view.setTimeout(clear, 180); };
  const cancel = () => { view.clearTimeout(timer); clear(); };
  const leave = (event: PointerEvent) => { if (event.pointerType === 'mouse') cancel(); };
  container.addEventListener('pointerdown', paint, true);
  container.addEventListener('pointermove', paint, true);
  container.addEventListener('pointerup', release, true);
  container.addEventListener('pointercancel', cancel, true);
  container.addEventListener('pointerleave', leave);
  return () => {
    cancel();
    container.removeEventListener('pointerdown', paint, true);
    container.removeEventListener('pointermove', paint, true);
    container.removeEventListener('pointerup', release, true);
    container.removeEventListener('pointercancel', cancel, true);
    container.removeEventListener('pointerleave', leave);
  };
}
