import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { useSession, hasRole, type SessionInfo } from "../useSession";
import { BrickLogo, Spinner, StateBanner } from "../ui";
import { cn } from "@/lib/utils";

/**
 * Authenticated shell for /events/manage. Client-side guard only for UX —
 * every API is enforced server-side.
 */
export function ManageLayout({ children, title, minRole = "checkin_staff" }: {
  children: ReactNode;
  title?: string;
  minRole?: "checkin_staff" | "event_manager" | "business_owner";
}) {
  const { data: session, isLoading, isError } = useSession();
  const [location, navigate] = useLocation();
  const qc = useQueryClient();

  const logout = useMutation({
    mutationFn: () => api("/auth/logout", { method: "POST" }),
    onSettled: () => {
      qc.clear();
      navigate("/events/manage/login");
    },
  });

  if (isLoading) {
    return <Shell><Spinner label="Checking your session" /></Shell>;
  }
  if (isError) {
    return <Shell><StateBanner kind="error">Couldn't reach the server. Please refresh.</StateBanner></Shell>;
  }
  if (!session) {
    navigate(`/events/manage/login?next=${encodeURIComponent(location)}`, { replace: true });
    return <Shell><Spinner label="Redirecting to sign in" /></Shell>;
  }
  if (!session.membership && !session.user.isPlatformAdmin) {
    return (
      <Shell>
        <StateBanner kind="warn">Your account has no active team membership. Ask the business owner for an invitation.</StateBanner>
      </Shell>
    );
  }
  if (!hasRole(session, minRole) && !session.user.isPlatformAdmin) {
    return (
      <Shell session={session} onLogout={() => logout.mutate()}>
        <StateBanner kind="warn">You don't have permission to view this page.</StateBanner>
      </Shell>
    );
  }

  return (
    <Shell session={session} onLogout={() => logout.mutate()}>
      {title && <h1 className="text-xl md:text-2xl font-galvji-light tracking-extra-wide mb-6">{title}</h1>}
      {children}
    </Shell>
  );
}

function Shell({ children, session, onLogout }: {
  children: ReactNode;
  session?: SessionInfo;
  onLogout?: () => void;
}) {
  const [location] = useLocation();
  const canManage = hasRole(session ?? null, "event_manager");
  const isOwner = hasRole(session ?? null, "business_owner");
  const nav = [
    ...(canManage ? [
      { href: "/events/manage", label: "Dashboard", exact: true },
      { href: "/events/manage/events", label: "Events" },
    ] : []),
    ...(isOwner ? [
      { href: "/events/manage/team", label: "Team" },
      { href: "/events/manage/settings", label: "Settings" },
    ] : []),
    ...(session?.user.isPlatformAdmin ? [{ href: "/events/platform", label: "Platform" }] : []),
  ];
  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:text-black focus:px-4 focus:py-2 focus:rounded-[10px] text-sm">
        Skip to content
      </a>
      <header className="border-b border-white/15">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-5">
            <BrickLogo />
            {session && (
              <nav aria-label="Organizer navigation" className="flex flex-wrap gap-1">
                {nav.map((item) => {
                  const active = item.exact ? location === item.href : location.startsWith(item.href);
                  return (
                    <Link key={item.href} href={item.href}
                      className={cn(
                        "px-3 py-1.5 rounded-[8px] text-[11px] font-sans uppercase tracking-[0.18em] transition-colors",
                        active ? "bg-white text-black" : "text-white/70 hover:text-white hover:bg-white/10",
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>
          {session && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-light text-white/50 hidden sm:inline">{session.user.name}</span>
              <button onClick={onLogout}
                className="px-3 py-1.5 border border-white/40 rounded-[8px] text-[11px] font-sans uppercase tracking-[0.18em] text-white/70 hover:bg-white hover:text-black transition-colors cursor-pointer">
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>
      <main id="main" className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
