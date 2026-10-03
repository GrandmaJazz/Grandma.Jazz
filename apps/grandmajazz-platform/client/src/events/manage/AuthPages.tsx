import { useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { api, ApiError } from "../api";
import { useInvalidateSession } from "../useSession";
import { BrickButton, BrickTile, EventsLayout, Field, StateBanner, TextInput } from "../ui";

/** Login, forgot/reset password, and invitation acceptance pages. */

function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <EventsLayout>
      <div className="max-w-sm mx-auto mt-4">
        <h1 className="text-xl font-galvji-light tracking-extra-wide mb-6 text-center">{title}</h1>
        <BrickTile>{children}</BrickTile>
      </div>
    </EventsLayout>
  );
}

export function LoginPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const invalidate = useInvalidateSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = useMutation({
    mutationFn: () => api("/auth/login", { method: "POST", json: { email, password } }),
    onSuccess: () => {
      invalidate();
      const next = new URLSearchParams(search).get("next");
      navigate(next && next.startsWith("/events/") ? next : "/events/manage");
    },
  });
  const error = login.error instanceof ApiError ? login.error.message : login.error ? "Sign-in failed" : null;

  return (
    <AuthShell title="Organizer sign in">
      <form noValidate onSubmit={(e) => { e.preventDefault(); if (!login.isPending) login.mutate(); }}>
        {error && <StateBanner kind="error">{error}</StateBanner>}
        <Field label="Email" required>
          {(id) => <TextInput id={id} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
        <Field label="Password" required>
          {(id) => <TextInput id={id} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
        </Field>
        <BrickButton type="submit" className="w-full" disabled={login.isPending} aria-live="polite">
          {login.isPending ? "Signing in…" : "Sign in"}
        </BrickButton>
        <p className="mt-4 text-center">
          <Link href="/events/manage/forgot-password" className="text-xs font-light text-white/60 underline hover:text-white">
            Forgotten your password?
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const forgot = useMutation({
    mutationFn: () => api("/auth/forgot-password", { method: "POST", json: { email } }),
    onSuccess: () => setDone(true),
  });
  return (
    <AuthShell title="Reset your password">
      {done ? (
        <StateBanner kind="success">If that account exists, a reset link is on its way. Check your inbox.</StateBanner>
      ) : (
        <form noValidate onSubmit={(e) => { e.preventDefault(); if (!forgot.isPending) forgot.mutate(); }}>
          {forgot.isError && <StateBanner kind="error">Something went wrong. Please try again.</StateBanner>}
          <Field label="Email" required>
            {(id) => <TextInput id={id} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />}
          </Field>
          <BrickButton type="submit" className="w-full" disabled={forgot.isPending}>
            {forgot.isPending ? "Sending…" : "Send reset link"}
          </BrickButton>
        </form>
      )}
      <p className="mt-4 text-center">
        <Link href="/events/manage/login" className="text-xs font-light text-white/60 underline hover:text-white">Back to sign in</Link>
      </p>
    </AuthShell>
  );
}

function useTokenFromQuery(): string {
  const search = useSearch();
  return new URLSearchParams(search).get("token") || "";
}

export function ResetPasswordPage() {
  const [, navigate] = useLocation();
  const token = useTokenFromQuery();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const reset = useMutation({
    mutationFn: () => api("/auth/reset-password", { method: "POST", json: { token, password } }),
    onSuccess: () => navigate("/events/manage/login"),
  });
  const error = localError || (reset.error instanceof ApiError ? reset.error.message : reset.error ? "Reset failed" : null);

  return (
    <AuthShell title="Choose a new password">
      {!token ? (
        <StateBanner kind="error">This link is missing its token. Open the link from your email again.</StateBanner>
      ) : (
        <form noValidate onSubmit={(e) => {
          e.preventDefault();
          setLocalError(null);
          if (password.length < 10) { setLocalError("Password must be at least 10 characters"); return; }
          if (password !== confirm) { setLocalError("Passwords don't match"); return; }
          if (!reset.isPending) reset.mutate();
        }}>
          {error && <StateBanner kind="error">{error}</StateBanner>}
          <Field label="New password" required hint="At least 10 characters">
            {(id) => <TextInput id={id} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
          </Field>
          <Field label="Repeat password" required>
            {(id) => <TextInput id={id} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />}
          </Field>
          <BrickButton type="submit" className="w-full" disabled={reset.isPending}>
            {reset.isPending ? "Saving…" : "Set password"}
          </BrickButton>
        </form>
      )}
    </AuthShell>
  );
}

export function AcceptInvitePage() {
  const [, navigate] = useLocation();
  const token = useTokenFromQuery();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const accept = useMutation({
    mutationFn: () => api("/auth/accept-invite", { method: "POST", json: { token, password, name } }),
    onSuccess: () => navigate("/events/manage/login"),
  });
  const error = localError || (accept.error instanceof ApiError ? accept.error.message : accept.error ? "Could not accept the invitation" : null);

  return (
    <AuthShell title="Welcome to the team">
      {!token ? (
        <StateBanner kind="error">This link is missing its token. Open the link from your email again.</StateBanner>
      ) : (
        <form noValidate onSubmit={(e) => {
          e.preventDefault();
          setLocalError(null);
          if (password.length < 10) { setLocalError("Password must be at least 10 characters"); return; }
          if (password !== confirm) { setLocalError("Passwords don't match"); return; }
          if (!accept.isPending) accept.mutate();
        }}>
          {error && <StateBanner kind="error">{error}</StateBanner>}
          <Field label="Your name" hint="Shown to your teammates">
            {(id) => <TextInput id={id} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />}
          </Field>
          <Field label="Password" required hint="At least 10 characters">
            {(id) => <TextInput id={id} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
          </Field>
          <Field label="Repeat password" required>
            {(id) => <TextInput id={id} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />}
          </Field>
          <BrickButton type="submit" className="w-full" disabled={accept.isPending}>
            {accept.isPending ? "Setting up…" : "Accept invitation"}
          </BrickButton>
        </form>
      )}
    </AuthShell>
  );
}
