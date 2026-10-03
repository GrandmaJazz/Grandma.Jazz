export const readerTiming = { pickup: 420, opening: 460, turn: 360, focus: 220, closing: 360, returning: 420 } as const;

export function fitReader(width: number, height: number, pageWidth: number, pageHeight: number) {
  const w = Math.max(1, width), h = Math.max(1, height);
  const inset = w < 700 ? 8 : 16;
  const usableWidth = Math.max(1, w - inset * 2), usableHeight = Math.max(1, h - inset * 2);
  const spreadPageWidth = Math.min(usableWidth / 2, usableHeight * pageWidth / pageHeight);
  const single = w < 900 || spreadPageWidth < 360;
  const scale = Math.min(usableWidth / (pageWidth * (single ? 1 : 2)), usableHeight / pageHeight);
  return { single, scale, pagePixels: pageWidth * scale, heightPixels: pageHeight * scale, inset };
}

export function releaseDuration(progress: number, complete: boolean, velocity = 0, automatic = false) {
  if (automatic) return readerTiming.turn;
  const remaining = Math.abs((complete ? 1 : 0) - progress);
  return Math.max(140, Math.min(320, 140 + remaining * 180 - Math.min(1.5, Math.abs(velocity)) * 55));
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

// Pointer bursts retain only their latest value until the next render frame.
export function latestFrameValue<T>() {
  let value: T | undefined;
  return { set(next: T) { value = next; }, take() { const next = value; value = undefined; return next; }, clear() { value = undefined; } };
}
