export const readerTiming = { pickup: 380, opening: 460, turn: 260, focus: 220, closing: 240, returning: 380 } as const;

export function fitReader(width: number, height: number, pageWidth: number, pageHeight: number) {
  const w = Math.max(1, width), h = Math.max(1, height);
  const inset = w < 700 ? 8 : 16;
  const usableWidth = Math.max(1, w - inset * 2), usableHeight = Math.max(1, h - inset * 2);
  const spreadPageWidth = Math.min(usableWidth / 2, usableHeight * pageWidth / pageHeight);
  const single = w < 900 || spreadPageWidth < 360;
  const scale = Math.min(usableWidth / (pageWidth * (single ? 1 : 2)), usableHeight / pageHeight);
  return { single, scale, pagePixels: pageWidth * scale, heightPixels: pageHeight * scale, inset };
}

export function releaseDuration(progress: number, complete: boolean, velocity = 0, automatic = false, single = false) {
  if (automatic) return single ? 850 : 460;
  const remaining = Math.abs((complete ? 1 : 0) - progress);
  if (single) return Math.max(520, Math.min(900, 520 + remaining * 360));
  return Math.max(250, Math.min(460, 280 + remaining * 180 - Math.min(1.5, Math.abs(velocity)) * 40));
}

export function boundedPan(value: number, pageSize: number, visibleSize: number, zoom: number) {
  const limit = Math.max(0, (pageSize * zoom - visibleSize) / 2);
  return Math.max(-limit, Math.min(limit, value));
}

export function tapZone(fraction: number) { return fraction < .22 ? "previous" : fraction > .78 ? "next" : "centre"; }

export function gestureDirection(deltaX: number, deltaY: number, threshold = 12) {
  if (Math.abs(deltaX) <= threshold || Math.abs(deltaX) <= Math.abs(deltaY) * 1.12) return null;
  return deltaX < 0 ? "forward" as const : "backward" as const;
}

export function phoneGestureDirection(deltaX: number, deltaY: number, edge: boolean) {
  if (Math.abs(deltaX) <= (edge ? 8 : 12) || (!edge && Math.abs(deltaX) <= Math.abs(deltaY) * .8)) return null;
  return deltaX < 0 ? "forward" as const : "backward" as const;
}

// Pointer bursts retain only their latest value until the next render frame.
export function latestFrameValue<T>() {
  let value: T | undefined;
  return { set(next: T) { value = next; }, take() { const next = value; value = undefined; return next; }, clear() { value = undefined; } };
}

// Sample the desired displacement only on the render clock. Limit the rate
// as well as smoothing it: even a sudden flick cannot jump across the page.
export function mobilePeelStep(current: number, target: number, milliseconds: number, maxRate = .00165) {
  const dt = Math.max(0, Math.min(34, milliseconds));
  const delta = target - current;
  const step = Math.min(Math.abs(delta), Math.abs(delta) * (1 - Math.exp(-dt / 145)), dt * maxRate);
  return Math.abs(delta) < .0005 ? target : current + Math.sign(delta) * step;
}
