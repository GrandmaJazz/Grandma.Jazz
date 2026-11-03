// Shared physical pace for the quote and product rails.
export const AUTO_SCROLL_PX_PER_SECOND = 62;
export const RESUME_AFTER_IDLE_MS = 900;

// Three identical sets keep the same visible card across a native-scroll wrap.
export function wrapRailPosition(position: number, setWidth: number): number {
  if (setWidth <= 0) return position;
  return setWidth + ((position - setWidth) % setWidth + setWidth) % setWidth;
}
