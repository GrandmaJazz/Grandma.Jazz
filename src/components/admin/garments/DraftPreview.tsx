import { useEffect, useRef } from 'react';
import { getLogicalPages, type GarmentsIssue } from './issues';
export default function DraftPreview({ issue, onClose }: { issue: GarmentsIssue; onClose: () => void }) {
 const dialog = useRef<HTMLDialogElement>(null);
 useEffect(() => { dialog.current?.showModal(); }, []);
 return <dialog ref={dialog} aria-label="Edition preview" className="native-preview" onCancel={event => { event.preventDefault(); onClose(); }}>
 <header><h2>{issue.title} — preview</h2><button type="button" onClick={onClose}>Close preview</button></header>
 <div>{getLogicalPages(issue).map((page, index) => <figure key={page.id || index}>{page.image ? <img src={page.image} alt={page.alt} /> : <div style={{ aspectRatio: `${issue.width}/${issue.height}`, background: page.blankColor || issue.blankColor }} />}<figcaption>Page {index + 1} · {page.text || page.alt}</figcaption></figure>)}</div></dialog>;
}
