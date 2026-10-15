export type ScreenRect = { left: number; top: number; width: number; height: number };
export type ShelfBackdrop = { canvas: HTMLCanvasElement; rect: ScreenRect };

// Move only the finished canvas on the compositor. Changing its layout size
// during a flight reallocates the WebGL buffer and fights the camera's fit.
export function coverFlight(cover: ScreenRect, shelf: ScreenRect, stage: ScreenRect) {
  const scale = shelf.width / Math.max(1, cover.width);
  const x = shelf.left - stage.left - (cover.left - stage.left) * scale;
  const y = shelf.top - stage.top - (cover.top - stage.top) * scale;
  return `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
}

export function readScreenRect(value?: string): ScreenRect | null {
  try {
    const rect = JSON.parse(value || "null");
    return rect && [rect.left, rect.top, rect.width, rect.height].every(Number.isFinite) && rect.width > 0 && rect.height > 0 ? rect : null;
  } catch { return null; }
}
