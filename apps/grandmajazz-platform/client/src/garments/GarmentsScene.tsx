import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { createReader, type Callbacks, type ReaderCommand } from "./runtime";
import type { GarmentsIssue } from "./issues";

export type SceneHandle = { select: (slug: string) => void; command: (action: ReaderCommand) => void; focus: (slug: string | null) => void; resize: () => void; slideRow: (row: number, step: number) => void };
type Props = { issues: GarmentsIssue[]; shelfIssues?: GarmentsIssue[]; initialSlug?: string; callbacks: Callbacks };
const GarmentsScene = forwardRef<SceneHandle, Props>(function GarmentsScene({ issues, shelfIssues = issues, initialSlug, callbacks }, ref) {
  const host = useRef<HTMLDivElement>(null);
  const runtime = useRef<ReturnType<typeof createReader> | null>(null);
  const latest = useRef(callbacks); latest.current = callbacks;
  const initial = useRef(initialSlug); initial.current = initialSlug;
  useImperativeHandle(ref, () => ({
    select: slug => { void runtime.current?.select(slug); },
    command: action => runtime.current?.command(action),
    focus: slug => runtime.current?.hover(slug),
    resize: () => runtime.current?.resize(),
    slideRow: (row, step) => { void runtime.current?.slideRow(row, step); },
  }), []);
  useEffect(() => {
    if (!host.current) return;
    let reader: ReturnType<typeof createReader>;
    try {
      reader = createReader(host.current, issues, {
        status: s => latest.current.status(s), selected: s => latest.current.selected(s),
        closed: () => latest.current.closed(), fallback: () => latest.current.fallback(),
        centreTap: () => latest.current.centreTap?.(),
        backdrop: image => latest.current.backdrop?.(image),
        hint: latest.current.hint ? hint => latest.current.hint?.(hint) : undefined,
        rails: (rows, slugs) => latest.current.rails?.(rows, slugs),
      }, shelfIssues);
    } catch { latest.current.fallback(); return; }
    runtime.current = reader;
    const metrics = () => {
      if (host.current) host.current.dataset.metrics = JSON.stringify(reader.metrics());
    };
    host.current.addEventListener("garments:metrics", metrics);
    if (initial.current) void reader.select(initial.current);
    const element = host.current;
    return () => { element.removeEventListener("garments:metrics", metrics); reader.dispose(); runtime.current = null; };
  }, [issues, shelfIssues]);
  return <div ref={host} className="garments-canvas-host" data-testid="garments-3d-stage" />;
});
export default GarmentsScene;
