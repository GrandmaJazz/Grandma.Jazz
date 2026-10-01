import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ChevronLeft, ChevronRight, Instagram, BookOpen, RotateCcw, X, MoveDownRight } from "lucide-react";
import { useReaderChrome } from "./useReaderChrome";
import { buildMasterArchive, parseManifest, type GarmentsManifest, type GarmentsIssue } from "./issues";
import { PublicSiteHeader, PublicSiteFooter } from "@/components/PublicSiteChrome";
import type { SceneHandle } from "./GarmentsScene";
import type { ReaderStatus, RailStatus, ReaderHint } from "./runtime";
import "./garments.css";

const Scene = lazy(() => import("./GarmentsScene"));
const browsing: ReaderStatus = { mode: "browsing", slug: null, page: 0, count: 0, zoom: 1, error: null };
export default function GarmentsPage({ archive = false }: { archive?: boolean }) {
  const [location, navigate] = useLocation();
  const base = archive ? "/garments/archive" : "/garments";
  const routeSlug = location.split("/")[archive ? 3 : 2];
  const [manifest, setManifest] = useState<GarmentsManifest | null>(null);
  const [issues, setIssues] = useState<GarmentsIssue[]>([]);
  const [loadError, setLoadError] = useState("");
  const [status, setStatus] = useState<ReaderStatus>(browsing);
  const [readerArrived, setReaderArrived] = useState(false);
  const [backdrop, setBackdrop] = useState("");
  const [hint, setHint] = useState<ReaderHint | null>(null);
  const [rails, setRails] = useState<RailStatus[]>([]);
  const [visibleSlugs, setVisibleSlugs] = useState<string[]>([]);
  const [fallback, setFallback] = useState(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [fallbackReason, setFallbackReason] = useState("");
  const scene = useRef<SceneHandle>(null);
  const lastSlug = useRef<string | null>(null);
  const locationRef = useRef(location); locationRef.current = location;
  const issue = issues.find(i => i.slug === status.slug || (fallback && i.slug === routeSlug));
  const root = useRef<HTMLDivElement>(null);
  const immersive = !!issue && (fallback || readerArrived);
  const chrome = useReaderChrome(root, immersive, fallback || status.mode === "reading", status.mode === "returning");
  const busy = !["reading", "browsing", "error"].includes(status.mode);
  const rackIssues = useMemo(() => visibleSlugs.map(slug => issues.find(issue => issue.slug === slug)).filter((issue): issue is GarmentsIssue => !!issue), [issues, visibleSlugs]);
  const load = async () => {
    setLoadError("");
    try {
      const response = await fetch(`/api/garments/issues${archive ? "?archive=1" : ""}`, { cache: "no-store" });
      if (!response.ok) throw new Error("The archive could not be loaded.");
      const data = parseManifest(await response.json());
      const records = [...data.issues];
      if (import.meta.env.DEV && records.length === 0) {
        const { fixtureIssue } = await import("./fixtures");
        records.push(fixtureIssue);
      }
      if (routeSlug && !records.some(i => i.slug === routeSlug)) {
        const direct = await fetch(`/api/garments/issues/${encodeURIComponent(routeSlug)}`, { cache: "no-store" });
        if (direct.ok) records.push(...parseManifest(await direct.json()).issues);
      }
      setManifest(data); setIssues(records);
    } catch { setLoadError("The archive could not be loaded. Please try again."); }
  };
  useEffect(() => {
    document.title = "Garments | Grandma Jazz";
  }, []);
  useEffect(() => { void load(); document.body.classList.add("garments-active"); return () => document.body.classList.remove("garments-active"); }, []);
  useEffect(() => {
    if (!routeSlug && status.slug) scene.current?.command("close");
    if (routeSlug && !status.slug && status.mode === "browsing") scene.current?.select(routeSlug);
  }, [routeSlug]);
  useEffect(() => {
    if (status.mode !== "reading" || !status.slug) return;
    const chapterRoute = `${base}/${status.slug}`;
    if (locationRef.current !== chapterRoute) navigate(chapterRoute, { replace: true });
  }, [status.mode, status.slug, base]);
  useEffect(() => {
    if (immersive) root.current?.querySelector<HTMLButtonElement>('[aria-label="Close magazine"]')?.focus({ preventScroll: true });
  }, [immersive]);
  useLayoutEffect(() => {
    if (hint) root.current?.querySelector(".garments-canvas-host")?.dispatchEvent(new Event("garments:hint-visible"));
  }, [hint]);
  const select = (slug: string) => {
    lastSlug.current = slug;
    if (fallback) navigate(`${base}/${slug}`);
    else scene.current?.select(slug);
  };
  const closeFallback = () => { navigate(base); setStatus(browsing); setReaderArrived(false); };
  const control = (name: string, icon: React.ReactNode, action: () => void, disabled = false) => (
    <button type="button" className="garments-control" aria-label={name} title={name} onClick={action} disabled={disabled}>{icon}</button>
  );
  return (
    <div ref={root} className={`garments-page${immersive ? " garments-immersive" : ""}${chrome.visible ? "" : " garments-tools-hidden"}`} onFocusCapture={e => { if ((e.target as HTMLElement).closest(".garments-reader-tools, .garments-reader-top")) chrome.show(); }}>
      {immersive && backdrop && <div className="garments-reader-backdrop" aria-hidden="true"><img src={backdrop} alt="" /></div>}
      {immersive && issue && <div className="garments-reader-top">
        {control("Close magazine", <X />, () => fallback ? closeFallback() : scene.current?.command("close"), ["closing", "returning"].includes(status.mode))}
        <span className="garments-sr-only" aria-live="polite">Issue {issue.issueNumber}, {status.pageType === "cover" ? "cover" : `page ${status.page}`}</span>
      </div>}
      <a href="#garments-main" className="garments-skip">Skip to archive</a>
      <PublicSiteHeader />
      <main id="garments-main" className="garments-main">
        <div className="garments-title-row">
          <div>
            <p className="garments-kicker">Editorial archive</p>
            {manifest?.logo ? <img className="garments-section-logo" src={manifest.logo} alt="Garments" /> : <h1>Garments</h1>}
          </div>
          {issue && <p className="garments-issue-title">{issue.title}{issue.publicationDate && <time dateTime={issue.publicationDate}>{issue.publicationDate}</time>}</p>}
        </div>
        {!status.slug && <nav className="garments-tabs" aria-label="Publication collection"><Link className="garments-text-control" href="/garments" aria-current={!archive ? "page" : undefined}>Newsstand</Link><Link className="garments-text-control" href="/garments/archive" aria-current={archive ? "page" : undefined}>Archive</Link></nav>}
        {issues.some(i => i.isDevelopmentFixture) && <p className="garments-preview" role="note">Development preview · Test pages, not a published issue.</p>}
        {loadError ? <div className="garments-message" role="alert"><p>{loadError}</p><button className="garments-text-control" onClick={() => void load()}>Try again</button></div>
          : !manifest ? <p className="garments-message" role="status">Loading archive...</p>
          : issues.length === 0 ? <div className="garments-message"><h2>{routeSlug ? "This edition is unavailable." : archive ? "No archived editions." : "No issues published yet."}</h2><a href="https://www.grandmajazz.com/products/">Visit the shop</a></div>
          : <>
            {routeSlug && !issues.some(i => i.slug === routeSlug) && <p role="alert">This issue is unavailable. <Link href="/garments">Return to the newsstand</Link></p>}
            {fallbackReason && <p className="garments-preview" role="status">{fallbackReason}</p>}
            {fallback ? <AccessibleReader issue={issue} issues={issues} onSelect={select} onClose={closeFallback} /> :
              <section className={`garments-stage${issues.length > 4 ? " garments-rack-stage" : ""}`} aria-label="Garments newsstand">
                <Suspense fallback={<p className="garments-message" role="status">Preparing newsstand...</p>}>
                  <Scene ref={scene} issues={issues} initialSlug={routeSlug} callbacks={{
                    status: next => {
                      setStatus(next);
                      if (next.mode === "browsing") setReaderArrived(false);
                      else if (next.mode === "reading") setReaderArrived(true);
                    },
                    centreTap: chrome.toggle,
                    backdrop: setBackdrop,
                    hint: setHint,
                    rails: (rows, slugs) => { setRails(rows); setVisibleSlugs(previous => previous.join("|") === slugs.join("|") ? previous : slugs); },
                    selected: slug => { lastSlug.current = slug; if (locationRef.current !== `${base}/${slug}`) navigate(`${base}/${slug}`); },
                    closed: () => {
                      if (locationRef.current !== base) navigate(base, { replace: true });
                      requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-issue="${lastSlug.current}"]`)?.focus({ preventScroll: true }));
                    },
                    fallback: () => { setFallbackReason("3D is unavailable. All pages are available below."); setFallback(true); },
                  }} />
                </Suspense>
                {immersive && hint && <p className="garments-turn-hint" style={{ left: hint.x - 12, top: hint.y - 40 }} role="status">
                  <span>Grab here and drag to turn the page.</span><MoveDownRight size={18} aria-hidden="true" />
                </p>}
                {status.mode === "browsing" && rails.filter(row => row.count > row.slots).map(row => <nav key={row.row} className="garments-shelf-rail-controls" style={{ top: `${row.top}%` }} aria-label={`Shelf ${row.row + 1}`}>
                  {control(`Previous editions on shelf ${row.row + 1}`, <ChevronLeft />, () => scene.current?.slideRow(row.row, -row.slots), row.busy || row.offset === 0)}
                  {control(`More editions on shelf ${row.row + 1}`, <ChevronRight />, () => scene.current?.slideRow(row.row, row.slots), row.busy || row.offset + row.slots >= row.count)}
                </nav>)}
                {status.mode === "loading" && <p className="garments-stage-status" role="status">Preparing pages...</p>}
                {status.mode === "browsing" && !!status.coversPending && !status.error && <p className="garments-stage-status" role="status">Preparing covers...</p>}
                {status.error && <div className="garments-stage-status" role="alert"><p>{status.error}</p>{!immersive && <button className="garments-text-control" onClick={() => scene.current?.command("retry")}>Retry</button>}</div>}
              </section>}
            {!fallback && !immersive && <div className="garments-controls garments-reader-tools" aria-label="Reader controls">
              {!immersive && control("Return to newsstand", <ArrowLeft />, () => scene.current?.command("close"), !issue || ["closing", "returning"].includes(status.mode))}
              {control("Previous page", <ChevronLeft />, () => scene.current?.command("previous"), !issue || busy || status.globalPage === 0 || status.zoom > 1)}
              <output className="garments-position" aria-live="polite">{issue ? status.pageType === "cover" ? "Cover" : `${status.page} / ${Math.max(1, status.count - 1)}` : "Newsstand"}</output>
              {control("Next page", <ChevronRight />, () => scene.current?.command("next"), !issue || busy || (status.globalPage ?? 0) >= (status.globalCount ?? 1) - 1 || status.zoom > 1)}
              {control("Accessible reader", <BookOpen />, () => setFallback(true))}
              {(issue?.enquiryUrl || manifest.enquiryUrl) && <a className="garments-control" aria-label="Enquire on Instagram" title="Enquire on Instagram" target="_blank" rel="noopener noreferrer" href={issue?.enquiryUrl || manifest.enquiryUrl}><Instagram /></a>}
            </div>}
            {fallback && !immersive && <div className="garments-controls garments-reader-tools"><button className="garments-text-control" onClick={() => { setFallbackReason(""); setStatus(browsing); setReaderArrived(false); setFallback(false); }}><RotateCcw /> 3D reader</button></div>}
            {!fallback && <div className="garments-issue-list" aria-label="Issues">
              {rackIssues.map(i => <button key={i.slug} data-issue={i.slug} className="garments-issue-link" onFocus={() => scene.current?.focus(i.slug)} onBlur={() => scene.current?.focus(null)} onClick={() => select(i.slug)} disabled={!!status.slug || busy}>
                <span>{i.isDevelopmentFixture ? "Development specimen" : `Issue ${i.issueNumber}`}</span><strong>{i.title}</strong>
                {i.publicationDate && <time dateTime={i.publicationDate}>{i.publicationDate}</time>}
              </button>)}
            </div>}
          </>}
      </main>
      <PublicSiteFooter />
    </div>
  );
}
function AccessibleReader({ issue, issues, onSelect, onClose }: { issue?: GarmentsIssue; issues: GarmentsIssue[]; onSelect: (slug: string) => void; onClose: () => void }) {
  const content = useRef<HTMLOListElement>(null);
  useEffect(() => {
    if (issue) content.current?.querySelector<HTMLElement>(`[data-chapter="${issue.slug}"]`)?.scrollIntoView({ block: "start" });
  }, [issue?.slug]);
  if (!issue) return <div className="garments-fallback-list">{issues.map(i => <button key={i.slug} className="garments-issue-link" onClick={() => onSelect(i.slug)}>{i.title}</button>)}</div>;
  const archive = buildMasterArchive(issues);
  return <article className="garments-fallback">
    <button className="garments-text-control" onClick={onClose}><ArrowLeft /> Return to newsstand</button>
    <h2>Garments Master Archive</h2>
    <ol ref={content}>{archive.pages.map((p, i) => {
      const pageIssue = issues.find(candidate => candidate.slug === p.issueSlug) || issue;
      return <li key={`${p.issueId}-${p.id}-${i}`} data-chapter={p.pageType === "cover" ? p.issueSlug : undefined}>
      <h3>Issue {p.issueNumber} · {p.pageType === "cover" ? "Cover" : `${p.localPageIndex + 1} / ${p.localPageCount}`} · {p.title}</h3>
      {p.image && <img src={p.image} alt={p.alt} loading="lazy" onError={e => { e.currentTarget.alt = `Image unavailable. ${p.alt}`; }} />}
      {p.blank && <div className={`garments-blank-page ${(p.blankColor || pageIssue.blankColor) === "black" ? "is-black" : ""}`} style={{ aspectRatio: `${pageIssue.width} / ${pageIssue.height}` }} aria-label={p.alt} />}
      {p.fixture?.photo && <img src={p.fixture.photo} alt={p.alt} loading="lazy" />}
      <p>{p.text || p.alt}</p>
    </li>; })}</ol>
  </article>;
}
