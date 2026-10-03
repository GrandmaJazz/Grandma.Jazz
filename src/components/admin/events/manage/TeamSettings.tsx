import EventMessaging from "./EventMessaging";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../api";
import { ManageLayout } from "./ManageLayout";
import { BrickButton, BrickTile, Field, MicroLabel, Spinner, StateBanner, TextInput } from "../ui";

/** Team management + business settings + password change. business_owner only. */

const ROLE_LABEL: Record<string, string> = {
  business_owner: "Owner",
  event_manager: "Event manager",
  checkin_staff: "Door staff",
};

export function TeamPage() {
  const qc = useQueryClient();
  const [flash, setFlash] = useState<string | null>(null);
  const team = useQuery({
    queryKey: ["manage-team"],
    queryFn: () => api<{ team: Array<{ membershipId: string; role: string; status: string; userId: string; name: string; email: string }> }>("/manage/team"),
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("event_manager");
  const invite = useMutation({
    mutationFn: () => api("/manage/team/invite", { method: "POST", json: { name, email, role } }),
    onSuccess: () => {
      setFlash(`Invitation queued for ${email}.`);
      setName(""); setEmail("");
      qc.invalidateQueries({ queryKey: ["manage-team"] });
    },
  });
  const revoke = useMutation({
    mutationFn: (membershipId: string) => api(`/manage/team/${membershipId}/revoke`, { method: "POST" }),
    onSuccess: () => { setFlash("Access revoked."); qc.invalidateQueries({ queryKey: ["manage-team"] }); },
    onError: (err) => setFlash(err instanceof ApiError ? err.message : "Revoke failed"),
  });

  return (
    <ManageLayout title="Team" minRole="business_owner">
      {flash && <StateBanner kind="info">{flash}</StateBanner>}

      <BrickTile className="mb-8">
        <MicroLabel className="mb-3">Invite someone</MicroLabel>
        {invite.isError && <StateBanner kind="error">{invite.error instanceof ApiError ? invite.error.message : "Invitation failed"}</StateBanner>}
        <form noValidate className="grid sm:grid-cols-2 gap-x-6" onSubmit={(e) => { e.preventDefault(); if (!invite.isPending) invite.mutate(); }}>
          <Field label="Name" required>{(id) => <TextInput id={id} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
          <Field label="Email" required>{(id) => <TextInput id={id} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
          <Field label="Role" hint="Door staff can only run check-in — they never see contact details or exports.">
            {(id) => (
              <select id={id} value={role} onChange={(e) => setRole(e.target.value)}
                className="w-full bg-black text-white border-2 border-white/50 rounded-[10px] px-4 py-2.5 text-base font-light focus:border-white/90 focus:outline-none">
                <option value="event_manager">Event manager</option>
                <option value="checkin_staff">Door staff (check-in only)</option>
                <option value="business_owner">Owner</option>
              </select>
            )}
          </Field>
          <div className="flex items-end mb-5">
            <BrickButton type="submit" disabled={invite.isPending}>{invite.isPending ? "Inviting…" : "Send invitation"}</BrickButton>
          </div>
        </form>
      </BrickTile>

      {team.isLoading && <Spinner label="Loading team" />}
      {team.isError && <StateBanner kind="error">Couldn't load the team.</StateBanner>}
      {team.data && (
        <ul className="space-y-3">
          {team.data.team.map((member) => (
            <li key={member.membershipId} className="border-2 border-white/30 rounded-[10px] px-4 py-3 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-light">{member.name}</p>
                <p className="text-xs font-light text-white/50">{member.email}</p>
              </div>
              <span className="border border-white/40 rounded-full px-3 py-0.5 text-[10px] font-sans uppercase tracking-[0.15em]">
                {ROLE_LABEL[member.role] || member.role}
              </span>
              {member.status === "invited" && (
                <span className="border border-amber-300/60 text-amber-100 rounded-full px-3 py-0.5 text-[10px] font-sans uppercase tracking-[0.15em]">
                  invited
                </span>
              )}
              <BrickButton variant="quiet" className="px-3 py-1 text-[10px] border-red-400/60 text-red-200"
                onClick={() => { if (window.confirm(`Remove ${member.name}'s access?`)) revoke.mutate(member.membershipId); }}
                disabled={revoke.isPending}>
                Revoke
              </BrickButton>
            </li>
          ))}
        </ul>
      )}
    </ManageLayout>
  );
}

export function SettingsPage() {
  const qc = useQueryClient();
  const settings = useQuery({
    queryKey: ["manage-settings"],
    queryFn: () => api<{ business: { name: string; contactEmail: string | null; contactPhone: string | null; instagramUrl: string | null; defaultTimezone: string }; wallet: { apple: boolean; google: boolean; googleDemoReady: boolean } }>("/manage/settings"),
  });
  const [form, setForm] = useState<{ name: string; contactEmail: string; contactPhone: string; instagramUrl: string; defaultTimezone: string } | null>(null);
  const current = form ?? (settings.data ? {
    name: settings.data.business.name,
    contactEmail: settings.data.business.contactEmail ?? "",
    contactPhone: settings.data.business.contactPhone ?? "",
    instagramUrl: settings.data.business.instagramUrl ?? "",
    defaultTimezone: settings.data.business.defaultTimezone,
  } : null);

  const save = useMutation({
    mutationFn: () => api("/manage/settings", { method: "PUT", json: current }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["manage-settings"] }),
  });

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwDone, setPwDone] = useState(false);
  const changePw = useMutation({
    mutationFn: () => api("/auth/change-password", { method: "POST", json: { currentPassword, newPassword } }),
    onSuccess: () => { setPwDone(true); setCurrentPassword(""); setNewPassword(""); },
  });

  return (
    <ManageLayout title="Event settings" minRole="business_owner">
      {settings.isLoading && <Spinner label="Loading settings" />}
      {settings.isError && <StateBanner kind="error">Couldn't load settings.</StateBanner>}
      {settings.data && <BrickTile className="mb-8 max-w-xl">
        <MicroLabel className="mb-3">Event wallet passes</MicroLabel>
        <div className="space-y-4 text-sm font-light text-white/80">
          <div>
            <p className="font-medium text-white">Apple Wallet · {settings.data.wallet.apple ? 'Ready' : 'Needs server setup'}</p>
            <p>Ticket holders can add a pass from their ticket page. Event edits, cancellation, check-in and pass-holder messages update registered passes.</p>
          </div>
          <div>
            <p className="font-medium text-white">Google Wallet · {settings.data.wallet.google ? 'Ready' : settings.data.wallet.googleDemoReady ? 'Demo ready · publishing pending' : 'Issuer setup needed'}</p>
            <p>{settings.data.wallet.google
              ? 'Ticket holders can save a Google Wallet pass. Event changes and pass-holder messages update issued passes.'
              : settings.data.wallet.googleDemoReady
                ? 'Issuer, API and secure service account are connected. A demo event pass and update messages have been tested. Public saving will appear after Google approves the business profile and publishing access.'
                : 'Create a Google Wallet issuer account, enable its API and install its service-account key to turn this on.'}</p>
            {!settings.data.wallet.google && <a href={settings.data.wallet.googleDemoReady ? 'https://pay.google.com/business/console/' : 'https://developers.google.com/wallet/tickets/events/getting-started/issuer-onboarding'} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block underline underline-offset-4">{settings.data.wallet.googleDemoReady ? 'Open Google Wallet Console ↗' : 'Google issuer setup guide ↗'}</a>}
          </div>
          <p>Apple passes update with saved event changes, check-in and daily countdowns. After the event, they show “Thanks for coming — Grandma Jazz”. Use the controls below to message pass holders; phone notifications depend on the holder’s settings.</p>
        </div>
      </BrickTile>}
      <EventMessaging />
      {current && (
        <BrickTile className="mb-8 max-w-xl">
          <MicroLabel className="mb-3">Business</MicroLabel>
          {save.isSuccess && <StateBanner kind="success">Saved.</StateBanner>}
          {save.isError && <StateBanner kind="error">{save.error instanceof ApiError ? save.error.message : "Save failed"}</StateBanner>}
          <form noValidate onSubmit={(e) => { e.preventDefault(); if (!save.isPending) save.mutate(); }}>
            <Field label="Business name" required>
              {(id) => <TextInput id={id} value={current.name} onChange={(e) => setForm({ ...current, name: e.target.value })} />}
            </Field>
            <Field label="Contact email">
              {(id) => <TextInput id={id} type="email" value={current.contactEmail} onChange={(e) => setForm({ ...current, contactEmail: e.target.value })} />}
            </Field>
            <Field label="Contact phone">
              {(id) => <TextInput id={id} type="tel" value={current.contactPhone} onChange={(e) => setForm({ ...current, contactPhone: e.target.value })} />}
            </Field>
            <Field label="Instagram URL">
              {(id) => <TextInput id={id} type="url" value={current.instagramUrl} onChange={(e) => setForm({ ...current, instagramUrl: e.target.value })} />}
            </Field>
            <Field label="Default timezone" hint="Used for new events">
              {(id) => <TextInput id={id} value={current.defaultTimezone} onChange={(e) => setForm({ ...current, defaultTimezone: e.target.value })} />}
            </Field>
            <BrickButton type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save settings"}</BrickButton>
          </form>
        </BrickTile>
      )}

      <BrickTile className="max-w-xl">
        <MicroLabel className="mb-3">Your password</MicroLabel>
        {pwDone && <StateBanner kind="success">Password changed. Other sessions have been signed out.</StateBanner>}
        {changePw.isError && <StateBanner kind="error">{changePw.error instanceof ApiError ? changePw.error.message : "Change failed"}</StateBanner>}
        <form noValidate onSubmit={(e) => { e.preventDefault(); if (!changePw.isPending) changePw.mutate(); }}>
          <Field label="Current password" required>
            {(id) => <TextInput id={id} type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />}
          </Field>
          <Field label="New password" required hint="At least 10 characters">
            {(id) => <TextInput id={id} type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />}
          </Field>
          <BrickButton type="submit" disabled={changePw.isPending}>{changePw.isPending ? "Changing…" : "Change password"}</BrickButton>
        </form>
      </BrickTile>
    </ManageLayout>
  );
}

export function PlatformPage() {
  const qc = useQueryClient();
  const businessesQuery = useQuery({
    queryKey: ["platform-businesses"],
    queryFn: () => api<{ businesses: Array<{ business: { id: string; name: string; slug: string; status: string }; eventCount: number; registrationCount: number }> }>("/platform/businesses"),
  });
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const create = useMutation({
    mutationFn: () => api("/platform/businesses", { method: "POST", json: { name, ownerName, ownerEmail } }),
    onSuccess: () => {
      setName(""); setOwnerName(""); setOwnerEmail("");
      qc.invalidateQueries({ queryKey: ["platform-businesses"] });
    },
  });

  return (
    <ManageLayout title="Platform" minRole="checkin_staff">
      <BrickTile className="mb-8 max-w-xl">
        <MicroLabel className="mb-3">Create a business & invite its owner</MicroLabel>
        {create.isSuccess && <StateBanner kind="success">Business created — owner invitation queued.</StateBanner>}
        {create.isError && <StateBanner kind="error">{create.error instanceof ApiError ? create.error.message : "Creation failed"}</StateBanner>}
        <form noValidate onSubmit={(e) => { e.preventDefault(); if (!create.isPending) create.mutate(); }}>
          <Field label="Business name" required>{(id) => <TextInput id={id} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
          <Field label="Owner name" required>{(id) => <TextInput id={id} value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />}</Field>
          <Field label="Owner email" required>{(id) => <TextInput id={id} type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} />}</Field>
          <BrickButton type="submit" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create business"}</BrickButton>
        </form>
      </BrickTile>

      {businessesQuery.isLoading && <Spinner label="Loading businesses" />}
      {businessesQuery.data && (
        <ul className="space-y-3">
          {businessesQuery.data.businesses.map(({ business, eventCount, registrationCount }) => (
            <li key={business.id} className="border-2 border-white/30 rounded-[10px] px-4 py-3 flex flex-wrap items-center gap-3">
              <div className="flex-1">
                <p className="font-light">{business.name}</p>
                <p className="text-xs font-light text-white/50">{business.slug} · {eventCount} events · {registrationCount} registrations</p>
              </div>
              <span className={`border rounded-full px-3 py-0.5 text-[10px] font-sans uppercase tracking-[0.15em] ${business.status === "active" ? "border-white/60" : "border-red-400/60 text-red-200"}`}>
                {business.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </ManageLayout>
  );
}
