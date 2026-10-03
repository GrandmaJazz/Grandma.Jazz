import { useCallback, useEffect, useMemo, useState } from "react";
import { apiUrl } from "@/lib/api";

type Member = { id: string; title: string; name: string; email: string | null; createdAt: string | null; removedAt: string | null };
type Data = { source: string; emailConfigured: boolean; members: Member[] };
export default function FamilyMembersPanel({ headers, canAccess }: { headers: Record<string, string>; canAccess: boolean }) {
  const [data, setData] = useState<Data | null>(null), [error, setError] = useState(""), [message, setMessage] = useState("");
  const [query, setQuery] = useState(""), [filter, setFilter] = useState("active"), [busy, setBusy] = useState(false);
  const [recipient, setRecipient] = useState<Member | null>(null), [subject, setSubject] = useState(""), [body, setBody] = useState("");
  const [page, setPage] = useState(1);
  const load = useCallback(async () => {
    if (!canAccess) return;
    setError("");
    try {
      const response = await fetch(apiUrl("/api/admin/members"), { headers });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load members.");
      setData(result);
    } catch (error) { setError(error instanceof Error ? error.message : "Could not load members."); }
  }, [canAccess, headers]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPage(1); }, [query, filter]);
  const members = useMemo(() => (data?.members || []).filter(member => {
    if (filter === "removed" ? !member.removedAt : member.removedAt) return false;
    if (filter === "new" && (!member.createdAt || Date.parse(member.createdAt) < Date.now() - 7 * 86400000)) return false;
    return `${member.title} ${member.name} ${member.email || ""}`.toLowerCase().includes(query.toLowerCase());
  }).sort((a, b) => (Date.parse(b.createdAt || "") || 0) - (Date.parse(a.createdAt || "") || 0)), [data, filter, query]);
  const active = data?.members.filter(member => !member.removedAt) || [];
  const recent = active.filter(member => member.createdAt && Date.parse(member.createdAt) >= Date.now() - 7 * 86400000).length;
  async function action(member: Member, action: "remove" | "restore" | "email") {
    if (busy) return;
    if (action === "remove" && !window.confirm(`Remove ${member.title} ${member.name} from the wall? You can restore this name later.`)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(apiUrl(`/api/admin/members/${encodeURIComponent(member.id)}/${action}`), {
        method: "POST", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(action === "email" ? { subject, message: body } : {}),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The action failed. Please retry.");
      setMessage(action === "email" ? `Email sent to ${member.name}.` : action === "remove" ? "Name removed. You can restore it under Removed." : "Name restored.");
      if (action === "email") { setRecipient(null); setSubject(""); setBody(""); }
      await load();
    } catch (error) { setError(error instanceof Error ? error.message : "The action failed."); }
    finally { setBusy(false); }
  }
  return <section className="border border-white/20 p-4 space-y-4" aria-label="Family Wall members">
    <h2 className="text-xl">Family Wall members</h2>
    <div className="flex flex-wrap gap-8"><p>Total names: <strong>{data ? active.length : "…"}</strong></p><p>Added in the last 7 days: <strong>{data ? recent : "…"}</strong></p><p>Removed: <strong>{data ? data.members.length - active.length : "…"}</strong></p></div>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    {data && data.source !== "database" && <p role="alert">Showing a saved copy. Changes need a live database connection.</p>}
    <div className="flex flex-wrap gap-3"><label>Search names or emails<input className="block border border-white/40 bg-black p-2" type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <label>Show<select className="block border border-white/40 bg-black p-2" value={filter} onChange={event => setFilter(event.target.value)}><option value="active">All active names</option><option value="new">New names (last 7 days)</option><option value="removed">Removed names</option></select></label>
      <button className="border border-white/40 px-4" disabled={busy || !canAccess} onClick={() => void load()}>Refresh members</button></div>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="text-left py-2">{members.length} matching names · newest first</caption><thead><tr><th className="p-2">Name</th><th className="p-2">Email</th><th className="p-2">Added</th><th className="p-2">Actions</th></tr></thead>
      <tbody>{members.slice((page - 1) * 25, page * 25).map(member => <tr key={member.id} className="border-t border-white/20"><td className="p-2">{member.title} {member.name}</td><td className="p-2">{member.email || "No email recorded"}</td><td className="p-2">{member.createdAt ? new Date(member.createdAt).toLocaleString() : "Date not recorded"}</td><td className="p-2"><div className="flex gap-2">
        <button className="border border-white/40 px-3 py-2 disabled:opacity-40" disabled={busy || data?.source !== "database"} onClick={() => void action(member, member.removedAt ? "restore" : "remove")}>{member.removedAt ? "Restore name" : "Remove name"}</button>
        <button className="border border-white/40 px-3 py-2 disabled:opacity-40" disabled={busy || !member.email || !data?.emailConfigured || data.source !== "database"} onClick={() => { setRecipient(member); setSubject(""); setBody(""); }}>Email member</button>
      </div></td></tr>)}</tbody></table></div>
    {data && !members.length && <p>No names match this view.</p>}
    <div className="flex items-center gap-4"><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {Math.max(1, Math.ceil(members.length / 25))}</span><button disabled={page * 25 >= members.length} onClick={() => setPage(page + 1)}>Next</button></div>
    {data && !data.emailConfigured && <p>Email delivery needs to be connected before you can send messages.</p>}
    {recipient && <form className="border border-white/30 p-4 space-y-3" onSubmit={event => { event.preventDefault(); void action(recipient, "email"); }}>
      <h3>Email {recipient.title} {recipient.name}</h3><p>To: {recipient.email}</p>
      <label className="block">Subject<input required maxLength={160} className="block w-full border border-white/40 bg-black p-2" value={subject} onChange={event => setSubject(event.target.value)} /></label>
      <label className="block">Message<textarea required maxLength={10000} rows={6} className="block w-full border border-white/40 bg-black p-2" value={body} onChange={event => setBody(event.target.value)} /></label>
      <div className="flex gap-4"><button type="submit" disabled={busy} className="border border-white/40 px-4 py-2">{busy ? "Sending…" : "Send email"}</button><button type="button" disabled={busy} onClick={() => setRecipient(null)}>Cancel</button></div>
    </form>}
  </section>;
}
