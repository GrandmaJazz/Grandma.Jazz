// Safari with "Block all cookies" (and some private/locked-down modes) throws a
// SecurityError on ANY localStorage access — not just writes. Every one of those
// calls used to sit unguarded inside a mount effect, so a single throw killed the
// whole React commit. With no error boundary in the app, that unmounted the entire
// tree and left the user staring at a black screen.
//
// Storage is a convenience here (cart, token, which album was playing), never
// load-bearing, so failing silently is always the right behaviour.
export const safeStorage = {
  get(key: string): string | null {
    try {
      if (typeof window === 'undefined') return null;
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(key, value);
    } catch {
      /* storage unavailable — non-fatal */
    }
  },
  remove(key: string): void {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.removeItem(key);
    } catch {
      /* storage unavailable — non-fatal */
    }
  },
};

export default safeStorage;
