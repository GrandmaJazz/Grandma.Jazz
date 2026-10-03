import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Activity, Download, KeyRound, MailCheck, RefreshCw, UploadCloud } from "lucide-react";
import FamilyMembersPanel from "@/components/FamilyMembersPanel";
import { apiUrl } from "@/lib/api";

type AdminStatus = {
  database: {
    source: "database" | "full-cache" | "wall-cache";
    live: boolean;
  };
  members: {
    total: number;
    withEmail: number;
    withoutEmail: number;
    mailchimpAdded: number;
    pendingMailchimp: number;
  };
  mailchimp: {
    configured: boolean;
    ping: boolean;
    audienceConfigured: boolean;
    audienceReachable: boolean;
    audienceName: string | null;
    error: string | null;
  };
  syncing: {
    signupPushEnabled: boolean;
    bulkPushAvailable: boolean;
  };
};

type PushResult = {
  source: string;
  requested: number;
  pushed: number;
  failed: number;
  skippedNoEmail: number;
  errors: Array<{ id: string; name: string; error: string }>;
};

function statusText(value: boolean) {
  return value ? "OK" : "Needs attention";
}

export default function Admin() {
  const useCurrentAdmin = window.location.pathname.includes("/family-admin");
  const [currentToken] = useState(() => window.localStorage.getItem("token") || "");
  const [adminKey, setAdminKey] = useState(() => window.localStorage.getItem("grandmajazz_admin_key") || "");
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [pushResult, setPushResult] = useState<PushResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [removeDuplicateEmails, setRemoveDuplicateEmails] = useState(true);

  const canAccess = useCurrentAdmin ? Boolean(currentToken) : Boolean(adminKey);
  const authHeaders = useMemo((): Record<string, string> => useCurrentAdmin
    ? { Authorization: `Bearer ${currentToken}` }
    : { "X-Admin-Key": adminKey }, [useCurrentAdmin, currentToken, adminKey]);

  useEffect(() => {
    if (adminKey) {
      window.localStorage.setItem("grandmajazz_admin_key", adminKey);
    }
  }, [adminKey]);

  async function loadStatus() {
    if (!canAccess) return;
    setBusy("status");
    setError("");
    try {
      const res = await fetch(apiUrl("/api/admin/status"), { headers: authHeaders });
      if (!res.ok) throw new Error(await res.text());
      setStatus(await res.json());
    } catch (err: any) {
      setError(err.message || "Status request failed");
    } finally {
      setBusy("");
    }
  }

  useEffect(() => {
    if (useCurrentAdmin && currentToken) void loadStatus();
  }, [useCurrentAdmin, currentToken]);

  async function pushMailchimp() {
    setBusy("push");
    setError("");
    setPushResult(null);
    try {
      const res = await fetch(apiUrl("/api/admin/mailchimp/push"), {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ onlyMissing: true }),
      });
      if (!res.ok) throw new Error(await res.text());
      setPushResult(await res.json());
      await loadStatus();
    } catch (err: any) {
      setError(err.message || "Mailchimp push failed");
    } finally {
      setBusy("");
    }
  }

  async function downloadExport(kind: "csv" | "json") {
    setBusy(kind);
    setError("");
    try {
      const dedupe = removeDuplicateEmails ? "?dedupe=email" : "";
      const res = await fetch(apiUrl(`/api/admin/export.${kind}${dedupe}`), { headers: authHeaders });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const filename = res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] || `grandmajazz-members.${kind}`;
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: any) {
      setError(err.message || "Export failed");
    } finally {
      setBusy("");
    }
  }

  async function downloadMailchimpExport(kind: "csv" | "xls" | "pdf") {
    setBusy(`mailchimp-${kind}`);
    setError("");
    try {
      const dedupe = removeDuplicateEmails ? "?dedupe=email" : "";
      const res = await fetch(apiUrl(`/api/admin/mailchimp-export.${kind}${dedupe}`), { headers: authHeaders });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const filename = res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] || `grandmajazz-mailchimp.${kind}`;
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: any) {
      setError(err.message || "Mailchimp export failed");
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="min-h-screen bg-black text-white px-4 py-6 md:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-white/20 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 inline-flex flex-col items-end justify-center border-2 border-white/90 bg-black px-4 py-3 text-white">
              <span className="text-base font-galvji-light tracking-extra-wide">Grandma</span>
              <span className="text-base font-galvji-light tracking-extra-wide">Jazz</span>
            </div>
            <h1 className="text-2xl font-light tracking-wide md:text-3xl">Admin</h1>
          </div>
          <div className="flex w-full max-w-md items-center gap-2">
            {!useCurrentAdmin && <><KeyRound className="h-5 w-5 shrink-0" />
            <input
              value={adminKey}
              onChange={(event) => setAdminKey(event.target.value)}
              type="password"
              className="h-10 min-w-0 flex-1 border border-white/30 bg-black px-3 text-sm outline-none focus:border-white"
              placeholder="Admin key"
            /></>}
            <button
              onClick={loadStatus}
              disabled={!canAccess || busy === "status"}
              className="inline-flex h-10 items-center gap-2 border border-white/40 px-3 text-sm uppercase tracking-wide hover:bg-white hover:text-black disabled:opacity-40"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </header>

        {error && (
          <div className="border border-white/30 bg-white px-4 py-3 text-sm text-black">
            {error}
          </div>
        )}

        <FamilyMembersPanel headers={authHeaders} canAccess={canAccess} />

        <section className="grid gap-3 md:grid-cols-4">
          <Metric label="Members" value={status?.members.total ?? "-"} />
          <Metric label="Emails" value={status ? `${status.members.withEmail}/${status.members.total}` : "-"} />
          <Metric label="Mailchimp" value={status ? statusText(status.mailchimp.ping && status.mailchimp.audienceReachable) : "-"} />
          <Metric label="Data Source" value={status?.database.source || "-"} />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Panel title="Connections" icon={<Activity className="h-5 w-5" />}>
            <StatusRow label="Database live" value={status?.database.live} detail={status?.database.source} />
            <StatusRow label="Signup push" value={status?.syncing.signupPushEnabled} />
            <StatusRow label="Mailchimp configured" value={status?.mailchimp.configured} />
            <StatusRow label="Mailchimp ping" value={status?.mailchimp.ping} />
            <StatusRow label="Audience reachable" value={status?.mailchimp.audienceReachable} detail={status?.mailchimp.audienceName || undefined} />
            {status?.mailchimp.error && <p className="mt-3 text-sm text-white/70">{status.mailchimp.error}</p>}
          </Panel>

          <Panel title="Actions" icon={<UploadCloud className="h-5 w-5" />}>
            <div className="grid gap-3 sm:grid-cols-3">
              <button
                onClick={pushMailchimp}
                disabled={!canAccess || busy === "push" || !status?.syncing.bulkPushAvailable}
                className="inline-flex h-12 items-center justify-center gap-2 border border-white/40 px-3 text-sm uppercase tracking-wide hover:bg-white hover:text-black disabled:opacity-40"
              >
                <MailCheck className="h-4 w-4" />
                Push
              </button>
              <button
                onClick={() => downloadExport("csv")}
                disabled={!canAccess || busy === "csv"}
                className="inline-flex h-12 items-center justify-center gap-2 border border-white/40 px-3 text-sm uppercase tracking-wide hover:bg-white hover:text-black disabled:opacity-40"
              >
                <Download className="h-4 w-4" />
                CSV
              </button>
              <button
                onClick={() => downloadExport("json")}
                disabled={!canAccess || busy === "json"}
                className="inline-flex h-12 items-center justify-center gap-2 border border-white/40 px-3 text-sm uppercase tracking-wide hover:bg-white hover:text-black disabled:opacity-40"
              >
                <Download className="h-4 w-4" />
                JSON
              </button>
            </div>
            {status && status.members.withoutEmail > 0 && (
              <p className="mt-4 text-sm text-white/65">
                {status.members.withoutEmail} cached wall records do not include email addresses.
              </p>
            )}
          </Panel>
        </section>

        <Panel title="Mailchimp Export" icon={<Download className="h-5 w-5" />}>
          <label className="mb-4 flex items-center justify-between gap-3 border border-white/20 px-3 py-3 text-sm">
            <span className="text-white/75">Remove duplicate emails</span>
            <input
              type="checkbox"
              checked={removeDuplicateEmails}
              onChange={(event) => setRemoveDuplicateEmails(event.target.checked)}
              className="h-5 w-5 accent-white"
            />
          </label>
          <div className="grid gap-3 md:grid-cols-3">
            <button
              onClick={() => downloadMailchimpExport("csv")}
                disabled={!canAccess || busy === "mailchimp-csv"}
              className="inline-flex h-12 items-center justify-center gap-2 border border-white/40 px-3 text-sm uppercase tracking-wide hover:bg-white hover:text-black disabled:opacity-40"
            >
              <Download className="h-4 w-4" />
              CSV
            </button>
            <button
              onClick={() => downloadMailchimpExport("xls")}
                disabled={!canAccess || busy === "mailchimp-xls"}
              className="inline-flex h-12 items-center justify-center gap-2 border border-white/40 px-3 text-sm uppercase tracking-wide hover:bg-white hover:text-black disabled:opacity-40"
            >
              <Download className="h-4 w-4" />
              Spreadsheet
            </button>
            <button
              onClick={() => downloadMailchimpExport("pdf")}
                disabled={!canAccess || busy === "mailchimp-pdf"}
              className="inline-flex h-12 items-center justify-center gap-2 border border-white/40 px-3 text-sm uppercase tracking-wide hover:bg-white hover:text-black disabled:opacity-40"
            >
              <Download className="h-4 w-4" />
              PDF
            </button>
          </div>
          <p className="mt-4 text-sm text-white/65">
            Mailchimp export columns: email, name, family_name, family_prefix. Rows without email are excluded.
          </p>
        </Panel>

        {pushResult && (
          <Panel title="Last Push" icon={<MailCheck className="h-5 w-5" />}>
            <div className="grid gap-3 md:grid-cols-4">
              <Metric label="Requested" value={pushResult.requested} />
              <Metric label="Pushed" value={pushResult.pushed} />
              <Metric label="Failed" value={pushResult.failed} />
              <Metric label="No Email" value={pushResult.skippedNoEmail} />
            </div>
            {pushResult.errors.length > 0 && (
              <div className="mt-4 max-h-48 overflow-auto border border-white/15">
                {pushResult.errors.slice(0, 25).map((item) => (
                  <div key={item.id} className="border-b border-white/10 px-3 py-2 text-sm last:border-b-0">
                    <span className="text-white">{item.name}</span>
                    <span className="ml-2 text-white/60">{item.error}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-white/20 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-white/55">{label}</div>
      <div className="mt-2 text-xl font-light">{value}</div>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="border border-white/20 p-4">
      <div className="mb-4 flex items-center gap-2 border-b border-white/10 pb-3">
        {icon}
        <h2 className="text-lg font-light tracking-wide">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function StatusRow({ label, value, detail }: { label: string; value?: boolean; detail?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/10 py-2 last:border-b-0">
      <span className="text-sm text-white/70">{label}</span>
      <span className="text-right text-sm">
        <span className={value ? "text-white" : "text-white/45"}>{value == null ? "-" : statusText(value)}</span>
        {detail && <span className="ml-2 text-white/45">{detail}</span>}
      </span>
    </div>
  );
}
