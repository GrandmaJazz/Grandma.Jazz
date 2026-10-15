import { useLayoutEffect, useRef } from "react";
import type { ShelfBackdrop } from "./readerFlight";

export function ReaderBackdrop({ snapshot, returning }: { snapshot: ShelfBackdrop | null; returning: boolean }) {
  const shelf = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!snapshot) return;
    shelf.current?.replaceChildren(snapshot.canvas);
    return () => snapshot.canvas.remove();
  }, [snapshot]);
  return <div className="garments-reader-backdrop" data-returning={returning} aria-hidden="true">
    {snapshot && <div ref={shelf} className="garments-return-shelf" style={{ left: snapshot.rect.left, top: snapshot.rect.top, width: snapshot.rect.width, height: snapshot.rect.height }} />}
  </div>;
}
