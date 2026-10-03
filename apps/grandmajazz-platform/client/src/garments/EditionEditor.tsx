import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUp, ArrowDown, Plus, Upload, Eye, Save, X, History, RefreshCw } from "lucide-react";
import type { Edition, Revision } from "../../../shared/garments-management";
import { blankPage, type GarmentsIssue, type GarmentsPageAsset } from "./issues";
import { orderUploadBatch } from "./draft";
import { api, ApiError } from "./managementApi";
import DraftPreview from "./DraftPreview";

export default function EditionEditor({ initial, onClose, onExpired }: { initial: Edition; onClose: () => void; onExpired: () => void }) {
  const [edition, setEdition] = useState(initial), [document, setDocument] = useState(initial.document);
  const [dirty, setDirty] = useState(false), [saving, setSaving] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState(""), [message, setMessage] = useState(""), [conflict, setConflict] = useState(false);
  const [preview, setPreview] = useState<GarmentsIssue | null>(null), [history, setHistory] = useState<Revision[] | null>(null), [uploads, setUploads] = useState<any[]>([]);
  const current = useRef(document), saved = useRef(document), record = useRef(edition), pending = useRef<Promise<Edition | undefined> | null>(null);
  const input = useRef<HTMLInputElement>(null), replace = useRef<number | null>(null), mounted = useRef(true), previewButton = useRef<HTMLButtonElement>(null);
  const faces = [document.cover, ...document.pages, document.backCover];
  function change(value: GarmentsIssue) { current.current = value; setDocument(value); setDirty(true); setMessage(""); }
  function changeFaces(next: GarmentsPageAsset[]) { change({ ...current.current, cover: next[0], pages: next.slice(1, -1), backCover: next[next.length - 1] }); }
  function fail(e: unknown) { setError((e as Error).message); if (e instanceof ApiError && e.status === 409) setConflict(true); if (e instanceof ApiError && e.status === 401) onExpired(); }
  async function save(): Promise<Edition | undefined> {
    if (pending.current) { const result = await pending.current; if (!result) return; if (current.current !== saved.current) return save(); return record.current; }
    if (current.current === saved.current) return record.current;
    if (conflict) return;
    const snapshot = current.current; setSaving(true); setError("");
    pending.current = api(`manage/editions/${record.current.id}`, "PUT", { version: record.current.version, document: snapshot }).then((result: Edition) => {
      record.current = result;
      if (current.current === snapshot) { current.current = saved.current = result.document; setDocument(result.document); setDirty(false); }
      else { saved.current = snapshot; setDirty(true); }
      setEdition(result); setMessage("Draft saved"); return result;
    }).catch(e => { fail(e); return undefined; }).finally(() => { pending.current = null; setSaving(false); });
    return pending.current;
  }
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { if (!dirty || conflict || busy) return; const timer = setTimeout(() => void save(), 1000); return () => clearTimeout(timer); }, [document, dirty, conflict, busy]);
  useEffect(() => { const warn = (e: BeforeUnloadEvent) => { if (current.current !== saved.current || busy) e.preventDefault(); }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [busy]);
  async function recover() { setError(""); try { setUploads(await api("manage/uploads")); } catch (e) { fail(e); } }
  function append(pages: any[], target: number | null = null) {
    const incoming: GarmentsPageAsset[] = pages.map(p => ({ id: crypto.randomUUID(), title: p.title, image: p.image, thumbnail: p.thumbnail, assetId: p.assetId, alt: p.title || "Magazine page", text: p.text }));
    const d = current.current, next = [d.cover, ...d.pages, d.backCover];
    if (target !== null) { if (incoming.length !== 1) throw new Error("A replacement must contain exactly one page"); next[target] = incoming[0]; }
    else { if (next[0].blank && !d.pages.length && incoming.length) next[0] = incoming.shift()!; next.splice(next.length - 1, 0, ...incoming); }
    if (next.length > 80) throw new Error("An edition can contain up to 80 supplied pages, including its covers");
    changeFaces(next);
  }
  async function upload(files: File[]) {
    if (busy || !files.length || conflict) return;
    const target = replace.current; replace.current = null;
    if (target !== null && files.length !== 1) { setError("Choose one replacement file"); return; }
    setBusy(true); setError("");
    try {
      for (const file of orderUploadBatch(files)) {
        if (!mounted.current) break;
        if (file.size > 25 * 1024 * 1024) throw new Error(`${file.name} exceeds 25 MB`);
        setMessage(`Converting ${file.name}`);
        const form = new FormData(); form.append("file", file);
        const job = await api("manage/uploads", "POST", form), started = Date.now();
        while (mounted.current) {
          const result = await api(`manage/uploads/${job.id}`);
          if (result.state === "error") throw new Error(result.error);
          if (result.state === "ready") { append(result.pages, target); await save(); break; }
          if (Date.now() - started > 300000) throw new Error("Conversion is still queued. Recover it from Recent uploads when ready.");
          await new Promise(resolve => setTimeout(resolve, 700));
        }
      }
    } catch (e) { fail(e); } finally { setBusy(false); if (input.current) input.current.value = ""; }
  }
  async function publish() {
    setBusy(true); setError("");
    try { const latest = await save(); if (!latest) return; const result = await api(`manage/editions/${latest.id}/action`, "POST", { version: latest.version, action: "publish" }); record.current = result; setEdition(result); setMessage(result.status === "archived" ? "Archive updated" : "Published to newsstand"); }
    catch (e) { fail(e); } finally { setBusy(false); }
  }
  async function restore(revision: string) {
    if (!window.confirm("Replace this draft with the selected published revision? The public edition will not change.")) return;
    setBusy(true);
    try { const latest = await save(); if (!latest) return; const result = await api(`manage/editions/${latest.id}/history/${revision}`, "POST", { version: latest.version }); record.current = result; current.current = saved.current = result.document; setEdition(result); setDocument(result.document); setDirty(false); setHistory(null); setMessage("Revision restored to draft"); }
    catch (e) { fail(e); } finally { setBusy(false); }
  }
  const disabled = busy || conflict;
  return <section aria-label="Edition editor">
    <div className="garments-editor-toolbar"><button className="garments-text-control" disabled={busy || saving} onClick={async () => { const result = await save(); if (result) onClose(); }}><ArrowLeft /> Editions</button><span>{edition.status}{edition.hasChanges && edition.status !== "draft" ? " - unpublished changes" : ""}</span><output role="status">{saving ? "Saving..." : dirty ? "Unsaved changes" : message || "Draft saved"}</output></div>
    {error && <p role="alert" className="garments-upload-error">{error}</p>}
    {conflict && <button className="garments-text-control" onClick={async () => { if (!window.confirm("Discard unsaved changes and load the latest draft?")) return; try { const result = await api(`manage/editions/${edition.id}`); record.current = result; current.current = saved.current = result.document; setEdition(result); setDocument(result.document); setDirty(false); setConflict(false); setError(""); } catch (e) { fail(e); } }}>Reload saved draft</button>}
    <fieldset disabled={disabled} className="garments-upload-fields">
      <label>Edition title<input value={document.title} maxLength={160} onChange={e => change({ ...current.current, title: e.target.value })} /></label>
      <label>Issue number<input value={document.issueNumber} maxLength={40} onChange={e => change({ ...current.current, issueNumber: e.target.value })} /></label>
      <label>Publication date<input type="date" value={document.publicationDate} onChange={e => change({ ...current.current, publicationDate: e.target.value })} /></label>
      <label>Instagram enquiry<input type="url" value={document.enquiryUrl || ""} onChange={e => change({ ...current.current, enquiryUrl: e.target.value || undefined })} /></label>
      <label>Blank pages<select aria-label="Blank pages" value={document.blankColor || "paper"} onChange={e => change({ ...current.current, blankColor: e.target.value as "paper" | "black", cover: { ...current.current.cover, blankColor: undefined }, pages: current.current.pages.map(p => ({ ...p, blankColor: undefined })), backCover: { ...current.current.backCover, blankColor: undefined } })}><option value="paper">Paper</option><option value="black">Black</option></select></label>
    </fieldset>
    <div className="garments-upload-summary"><h2>Pages ({faces.length})</h2><button className="garments-text-control" disabled={disabled || faces.length >= 80} onClick={() => { replace.current = null; input.current?.click(); }}><Upload /> Add pages</button><button className="garments-text-control" disabled={disabled || faces.length >= 80} onClick={() => { const next = [...faces]; next.splice(next.length - 1, 0, { ...blankPage, id: crypto.randomUUID() }); changeFaces(next); }}><Plus /> Blank page</button><button className="garments-text-control" disabled={disabled} onClick={() => void recover()}><RefreshCw /> Recent uploads</button></div>
    <input hidden ref={input} type="file" multiple={replace.current === null} accept=".svg,.pdf,.png,.jpg,.jpeg,.webp,.tif,.tiff,.avif" aria-label="Choose magazine files" onChange={e => void upload(Array.from(e.target.files || []))} />
    {!!uploads.length && <section className="garments-recent"><h3>Recent uploads</h3>{uploads.map(job => <div key={job.id}><span>{job.filename} - {job.state}</span><button className="garments-text-control" disabled={job.state !== "ready" || disabled} onClick={() => { try { append(job.pages); setUploads([]); } catch (e) { fail(e); } }}><Plus /> Add</button>{job.error && <p>{job.error}</p>}</div>)}</section>}
    <ol className="garments-upload-pages">{faces.map((page, index) => <li key={page.id + index}>
      {page.image ? <img src={page.thumbnail || page.image} alt={page.alt} loading="lazy" onError={e => { e.currentTarget.alt = "Artwork unavailable"; }} /> : <div className={`garments-blank-thumb ${document.blankColor === "black" ? "is-black" : ""}`} />}
      <div><strong>{index === 0 ? "Front cover" : index === faces.length - 1 ? "Back cover" : `Page ${index + 1}`}</strong><p>{page.title}</p><label>Image description<textarea maxLength={2000} value={page.alt} disabled={disabled} onChange={e => { const next = [...faces]; next[index] = { ...page, alt: e.target.value }; changeFaces(next); }} /></label></div>
      <div className="garments-upload-actions">
        <button className="garments-control" title="Replace artwork" aria-label={`Replace page ${index + 1}`} disabled={disabled} onClick={() => { replace.current = index; input.current?.click(); }}><Upload /></button>
        {[-1, 1].map(delta => <button key={delta} className="garments-control" title={delta < 0 ? "Move earlier" : "Move later"} aria-label={`Move page ${index + 1} ${delta < 0 ? "earlier" : "later"}`} disabled={disabled || index + delta < 0 || index + delta >= faces.length} onClick={() => { const next = [...faces]; [next[index], next[index + delta]] = [next[index + delta], next[index]]; changeFaces(next); }}>{delta < 0 ? <ArrowUp /> : <ArrowDown />}</button>)}
        <button className="garments-control" title={index === 0 || index === faces.length - 1 ? "Clear cover" : "Remove page"} aria-label={`Remove page ${index + 1}`} disabled={disabled} onClick={() => { const next = [...faces]; if (index === 0 || index === faces.length - 1) next[index] = { ...blankPage, id: crypto.randomUUID() }; else next.splice(index, 1); changeFaces(next); }}><X /></button>
      </div>
    </li>)}</ol>
    <div className="garments-publish"><button className="garments-text-control" disabled={disabled} onClick={() => api(`manage/editions/${edition.id}/history`).then(setHistory).catch(fail)}><History /> History</button><button className="garments-text-control" disabled={disabled || saving || !dirty} onClick={() => void save()}><Save /> Save draft</button><button ref={previewButton} className="garments-text-control" disabled={disabled || !faces.some(p => p.image)} onClick={() => setPreview(structuredClone(current.current))}><Eye /> Preview magazine</button><button className="garments-text-control" disabled={disabled || saving || !document.title.trim() || !faces.some(p => p.image)} onClick={() => void publish()}><Upload /> {edition.status === "archived" ? "Update archive" : "Publish"}</button></div>
    {history && <section className="garments-history"><h2>Publication history</h2>{!history.length && <p>No published revisions.</p>}{history.map(r => <div key={r.id}><span>{r.title} - {new Date(r.publishedAt!).toLocaleString()} - {r.author || "Imported"}</span><button className="garments-text-control" disabled={disabled} onClick={() => void restore(r.id)}>Restore to draft</button></div>)}</section>}
    {preview && <DraftPreview issue={preview} onClose={() => { setPreview(null); requestAnimationFrame(() => previewButton.current?.focus()); }} />}
  </section>;
}
