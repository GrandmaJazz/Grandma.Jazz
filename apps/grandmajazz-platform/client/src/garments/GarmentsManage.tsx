import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Plus, LogOut, Archive, Trash2, RotateCcw, EyeOff, Pencil, Users, X } from "lucide-react";
import type { Edition, EditionState, Staff } from "../../../shared/garments-management";
import { api } from "./managementApi";
import EditionEditor from "./EditionEditor";
import "./garments.css";

export default function GarmentsManage() {
  const [staff, setStaff] = useState<Staff | null>(null), [ready, setReady] = useState(false), [setup, setSetup] = useState(false);
  const [email, setEmail] = useState(""), [password, setPassword] = useState(""), [name, setName] = useState(""), [key, setKey] = useState("");
  const [error, setError] = useState(""), [message, setMessage] = useState(""), [busy, setBusy] = useState(false), [expired, setExpired] = useState(false);
  const [tab, setTab] = useState<EditionState>("published"), [editions, setEditions] = useState<Edition[]>([]), [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Edition | null>(null), [team, setTeam] = useState<any[] | null>(null), [role, setRole] = useState("editor");
  const token = new URLSearchParams(window.location.search).get("invite") || new URLSearchParams(window.location.search).get("reset");
  async function session() { const data = await api("auth/session"); setStaff(data.staff); setSetup(data.setup); setReady(true); return data; }
  async function list() { setEditions(await api(`manage/editions?status=${tab}`)); }
  useEffect(() => { document.body.classList.add("garments-active"); void session().catch(e => setError(e.message)); return () => document.body.classList.remove("garments-active"); }, []);
  useEffect(() => { if (staff && !selected) void list().catch(e => setError(e.message)); }, [staff, tab, selected]);
  async function run(fn: () => Promise<void>) { setBusy(true); setError(""); setMessage(""); try { await fn(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    await run(async () => {
      await api("auth/session");
      await api(token ? "auth/accept" : setup ? "auth/setup" : "auth/login", "POST", token ? { token, password } : { email, password, name, key });
      setPassword(""); setKey(""); setExpired(false); await session();
      if (token) window.history.replaceState(null, "", "/garments/manage");
    });
  }
  async function action(edition: Edition, action: string) {
    const question = action === "trash" ? "Move this edition to Trash? It will be removed from public reading and kept for 30 days." : action === "unpublish" ? "Unpublish this edition? Its public link will become unavailable." : action === "archive" ? "Move this edition to the public archive?" : "Restore this edition?";
    if (!window.confirm(question)) return;
    await run(async () => { await api(`manage/editions/${edition.id}/action`, "POST", { version: edition.version, action }); await list(); });
  }
  async function remove(edition: Edition) {
    const title = window.prompt(`Permanently delete this edition? This cannot be undone. Enter its exact title: ${edition.document.title}`);
    if (title === null) return;
    await run(async () => { await api(`manage/editions/${edition.id}`, "DELETE", { version: edition.version, title }); await list(); });
  }
  const loginForm = <form onSubmit={signIn} className="garments-login">
    {setup && !token && <><label>Name<input required maxLength={160} autoComplete="name" value={name} onChange={e => setName(e.target.value)} /></label><label>Setup key<input type="password" required value={key} onChange={e => setKey(e.target.value)} /></label></>}
    {!token && <label>Email<input required type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} /></label>}
    <label>{token ? "Password (existing account password for invitations)" : "Password"}<input type="password" required minLength={10} maxLength={200} autoComplete={setup || token ? "new-password" : "current-password"} value={password} onChange={e => setPassword(e.target.value)} /></label>
    <button className="garments-text-control" disabled={busy} type="submit">{token ? "Continue" : setup ? "Create owner account" : "Sign in"}</button>
    {!setup && !token && <button className="garments-text-control" type="button" disabled={busy || !email} onClick={() => run(async () => { const result = await api("auth/forgot", "POST", { email }); setMessage(result.message); })}>Reset password</button>}
  </form>;
  return <div className="garments-page">
    <header className="garments-header"><a href="https://www.grandmajazz.com/" className="garments-logo"><img src="/garments/brand/grandma-jazz.webp" alt="Grandma Jazz" width="164" height="72" /></a><Link className="garments-text-control" href="/garments" onClick={e => { if (selected && !window.confirm("Leave the editor? Any unsaved changes will be lost.")) e.preventDefault(); }}><ArrowLeft /> Newsstand</Link></header>
    <main className="garments-main garments-manager">
      <div className="garments-title-row"><div><p className="garments-kicker">Editorial archive</p><h1>{selected ? selected.document.title : "Garments editions"}</h1></div>{staff && !selected && <div className="garments-upload-actions">{staff.role === "owner" && <button className="garments-control" title="Staff" aria-label="Staff" onClick={() => run(async () => setTeam(await api("auth/staff")))}><Users /></button>}<button className="garments-control" title="Sign out" aria-label="Sign out" onClick={() => run(async () => { await api("auth/logout", "POST"); setTeam(null); await session(); })}><LogOut /></button></div>}</div>
      {error && <p className="garments-upload-error" role="alert">{error}</p>}{message && <p role="status">{message}</p>}
      {!ready ? <p role="status">Loading staff access...</p> : !staff || expired ? <>{expired && <p role="alert">Your session expired. Sign in to keep editing your unsaved draft.</p>}{loginForm}</> : null}
      {staff && !expired && !selected && !team && <>
        <div className="garments-editor-toolbar"><nav className="garments-tabs" aria-label="Edition status">{(["draft", "published", "archived", "trash"] as const).map(state => <button key={state} aria-current={tab === state ? "page" : undefined} className="garments-text-control" disabled={busy} onClick={() => setTab(state)}>{({ draft: "Drafts", published: "Published", archived: "Archived", trash: "Trash" })[state]}</button>)}</nav><button className="garments-text-control" disabled={busy} onClick={() => run(async () => setSelected(await api("manage/editions", "POST", {})))}><Plus /> New edition</button></div>
        <label className="garments-search">Search editions<input type="search" value={query} onChange={e => setQuery(e.target.value)} /></label>
        {tab === "trash" && <p>Trashed editions are kept for 30 days. Restored editions return to Drafts.</p>}
        {!editions.length && <p className="garments-message">No {tab === "trash" ? "trashed" : tab} editions.</p>}
        <div className="garments-editions">{editions.filter(e => `${e.document.title} ${e.document.issueNumber}`.toLowerCase().includes(query.toLowerCase())).map(edition => <article key={edition.id} className="garments-edition">
          {edition.document.cover.image ? <img src={edition.document.cover.thumbnail || edition.document.cover.image} alt={edition.document.cover.alt} loading="lazy" /> : <div className="garments-blank-thumb" />}
          <div><h2>{edition.document.title}</h2><p>{edition.document.issueNumber} {edition.document.publicationDate}</p><p>Updated {new Date(edition.updatedAt).toLocaleDateString()}{edition.updatedBy ? ` by ${edition.updatedBy}` : ""}</p>{edition.hasChanges && ["published", "archived"].includes(edition.status) && <p>Unpublished changes</p>}</div>
          <div className="garments-upload-actions">
            {tab !== "trash" && <button className="garments-control" title="Edit edition" aria-label={`Edit ${edition.document.title}`} disabled={busy} onClick={() => run(async () => setSelected(await api(`manage/editions/${edition.id}`)))}><Pencil /></button>}
            {tab === "published" && <button className="garments-control" title="Archive" aria-label={`Archive ${edition.document.title}`} disabled={busy} onClick={() => action(edition, "archive")}><Archive /></button>}
            {["published", "archived"].includes(tab) && <button className="garments-control" title="Unpublish" aria-label={`Unpublish ${edition.document.title}`} disabled={busy} onClick={() => action(edition, "unpublish")}><EyeOff /></button>}
            {["trash", "archived"].includes(tab) && <button className="garments-control" title="Restore" aria-label={`Restore ${edition.document.title}`} disabled={busy} onClick={() => action(edition, "restore")}><RotateCcw /></button>}
            {tab !== "trash" ? <button className="garments-control" title="Move to Trash" aria-label={`Trash ${edition.document.title}`} disabled={busy} onClick={() => action(edition, "trash")}><Trash2 /></button> : staff.role === "owner" && <button className="garments-control" title="Delete permanently" aria-label={`Delete ${edition.document.title} permanently`} disabled={busy} onClick={() => remove(edition)}><X /></button>}
          </div>
        </article>)}</div>
      </>}
      {selected && <div hidden={expired}><EditionEditor key={selected.id} initial={selected} onClose={() => setSelected(null)} onExpired={() => setExpired(true)} /></div>}
      {staff && team && !selected && <section>
        <button className="garments-text-control" onClick={() => setTeam(null)}><ArrowLeft /> Editions</button><h2>Staff</h2>
        <form className="garments-upload-fields" onSubmit={e => { e.preventDefault(); void run(async () => { await api("auth/staff", "POST", { email, name, role }); setTeam(await api("auth/staff")); setMessage("Invitation sent"); setEmail(""); setName(""); }); }}>
          <label>Name<input required value={name} onChange={e => setName(e.target.value)} /></label><label>Email<input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></label><label>Role<select value={role} onChange={e => setRole(e.target.value)}><option value="editor">Editor</option><option value="owner">Owner</option></select></label><button className="garments-text-control" disabled={busy}><Plus /> Invite staff</button>
        </form>
        {team.map(user => <div key={user.id} className="garments-staff-row"><div><strong>{user.name}</strong><p>{user.email} - {user.status}</p></div><select aria-label={`Role for ${user.name}`} value={user.role} disabled={busy || user.status !== "active"} onChange={e => run(async () => { await api(`auth/staff/${user.id}`, "PATCH", { role: e.target.value, status: "active" }); setTeam(await api("auth/staff")); })}><option value="editor">Editor</option><option value="owner">Owner</option></select>{user.status !== "revoked" && <button className="garments-text-control" disabled={busy} onClick={() => { if (window.confirm(`Revoke Garments access for ${user.name}?`)) void run(async () => { await api(`auth/staff/${user.id}`, "PATCH", { role: user.role, status: "revoked" }); setTeam(await api("auth/staff")); }); }}>Revoke</button>}</div>)}
      </section>}
    </main>
  </div>;
}
