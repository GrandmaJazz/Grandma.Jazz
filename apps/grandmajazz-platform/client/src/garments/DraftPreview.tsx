import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { useReaderChrome } from "./useReaderChrome";
import { getLogicalPages, type GarmentsIssue } from "./issues";
import type { SceneHandle } from "./GarmentsScene";
import type { ReaderStatus } from "./runtime";

const Scene = lazy(() => import("./GarmentsScene"));
export default function DraftPreview({ issue, onClose }: { issue: GarmentsIssue; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const scene = useRef<SceneHandle>(null);
  const issues = useMemo(() => [issue], [issue]);
  const [fallback, setFallback] = useState(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [backdrop, setBackdrop] = useState("");
  const [status, setStatus] = useState<ReaderStatus>({ mode: "loading", slug: null, page: 0, count: getLogicalPages(issue).length, zoom: 1, error: null });
  useEffect(() => { dialog.current?.showModal(); }, []);
  const reading = status.mode === "reading";
  const chrome = useReaderChrome(dialog, true, reading || fallback);
  return <dialog ref={dialog} className={`garments-draft-preview garments-immersive${chrome.visible ? "" : " garments-tools-hidden"}`} aria-labelledby="garments-preview-heading" onFocusCapture={e => { if ((e.target as HTMLElement).closest(".garments-reader-tools, .garments-reader-top")) chrome.show(); }} onCancel={e => { e.preventDefault(); onClose(); }}>
    {backdrop && <div className="garments-reader-backdrop" aria-hidden="true"><img src={backdrop} alt="" /></div>}
    <header className="garments-reader-top"><h2 id="garments-preview-heading" className="garments-sr-only">Unpublished preview: {issue.title}</h2><button type="button" className="garments-control" aria-label="Close preview" title="Close preview" onClick={onClose} autoFocus><X /></button></header>
    {fallback ? <div className="garments-draft-pages">{getLogicalPages(issue).map((page, index) => <figure key={index}>{page.image && <img src={page.image} alt={page.alt} loading="lazy" />}{page.blank && <div className={`garments-blank-page ${(page.blankColor || issue.blankColor) === "black" ? "is-black" : ""}`} style={{ aspectRatio: `${issue.width} / ${issue.height}` }} />}<figcaption>{index + 1}. {page.text || page.alt}</figcaption></figure>)}</div> : <>
      <section className="garments-stage" aria-label="Unpublished magazine preview"><Suspense fallback={<p role="status">Preparing preview...</p>}><Scene ref={scene} issues={issues} initialSlug={issue.slug} callbacks={{ status: setStatus, selected: () => {}, closed: onClose, fallback: () => setFallback(true), backdrop: setBackdrop }} /></Suspense>{status.error && <p className="garments-stage-status" role="alert">{status.error}</p>}</section>
    </>}
  </dialog>;
}
