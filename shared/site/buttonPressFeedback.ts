/** Touch feedback for shared CTAs without sticky hover or interfering with links. */
export function bindButtonPressFeedback(root: Document) {
  let pressed: HTMLElement | null = null;
  let pointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  const view = root.defaultView;
  const clear = () => {
    pressed?.removeAttribute('data-touch-pressed');
    pressed = null;
    pointerId = null;
  };
  const down = (event: PointerEvent) => {
    clear();
    if (!event.isPrimary || !['touch', 'pen'].includes(event.pointerType)) return;
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>('.gj-cta, .gj-theme-button, .gj-family-button, [data-gj-primary="true"]') : null;
    if (!target || target.matches(':disabled, [aria-disabled="true"]')) return;
    pressed = target;
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    target.setAttribute('data-touch-pressed', 'true');
  };
  const end = (event: PointerEvent) => { if (event.pointerId === pointerId) clear(); };
  const move = (event: PointerEvent) => {
    if (event.pointerId === pointerId && Math.hypot(event.clientX - startX, event.clientY - startY) > 10) clear();
  };
  root.addEventListener('pointerdown', down, { passive: true });
  root.addEventListener('pointermove', move, { passive: true });
  root.addEventListener('pointerup', end, { passive: true });
  root.addEventListener('pointercancel', end, { passive: true });
  view?.addEventListener('blur', clear);
  return () => {
    clear();
    root.removeEventListener('pointerdown', down);
    root.removeEventListener('pointermove', move);
    root.removeEventListener('pointerup', end);
    root.removeEventListener('pointercancel', end);
    view?.removeEventListener('blur', clear);
  };
}
