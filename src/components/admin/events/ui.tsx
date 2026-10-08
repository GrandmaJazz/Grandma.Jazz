import { type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes, forwardRef, useId } from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { apiUrl } from "../platformUrl";
const PublicSiteHeader = () => null;
const PublicSiteFooter = () => null;

/** Public event pages use the .com palette while organizer screens retain their own layout. */

// Rendered PNG (server-side, real Galvji TTF) — the same artwork as the
// wallet pass, so the logo is pixel-identical on web, email and passes.
export function BrickLogo({ className }: { className?: string }) {
  return (
    <a href="/events/" className={cn("inline-block", className)} aria-label="Grandma Jazz events home">
      <img
        src={apiUrl("events/assets/logo-web.png")}
        width={200}
        height={65}
        alt="Grandma Jazz"
        className="block h-[65px] w-auto"
      />
    </a>
  );
}

export const BrickButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "solid" | "quiet" }>(
  function BrickButton({ className, variant = "solid", ...props }, ref) {
    return (
      <button
        ref={ref}
        {...props}
          className={cn(
          "gj-cta",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          variant === "quiet" && "gj-cta--quiet",
          className,
        )}
      />
    );
  },
);

export function BrickLinkButton({ href, children, className, external }: {
  href: string; children: ReactNode; className?: string; external?: boolean;
}) {
  const cls = cn(
    "gj-cta",
    className,
  );
  if (external) {
    return <a href={href} className={cls} target="_blank" rel="noopener noreferrer">{children}</a>;
  }
  return <Link href={href} className={cls}>{children}</Link>;
}

export function BrickTile({ children, className, as: Tag = "div" }: {
  children: ReactNode; className?: string; as?: "div" | "section" | "article" | "li";
}) {
  return (
    <Tag className={cn("gj-theme-panel border-2 border-white/90 rounded-[10px] bg-black p-5 md:p-6", className)}>
      {children}
    </Tag>
  );
}

export function MicroLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("gj-theme-label block text-[11px] font-sans uppercase tracking-[0.2em] text-white/60", className)}>
      {children}
    </span>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="gj-display text-2xl md:text-3xl font-galvji-light tracking-extra-wide text-white">{children}</h1>
      {sub && <p className="mt-2 text-sm text-white/60 font-light tracking-wide">{sub}</p>}
    </div>
  );
}

// ---------------------------------------------------------------- form fields

type FieldWrapProps = { label: ReactNode; hint?: ReactNode; error?: string | null; required?: boolean; children: (id: string, describedBy?: string) => ReactNode };

export function Field({ label, hint, error, required, children }: FieldWrapProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="mb-5">
      <label htmlFor={id} className="gj-theme-label block mb-1.5 text-xs font-sans uppercase tracking-[0.18em] text-white/80">
        {label}{required && <span aria-hidden="true"> *</span>}
      </label>
      {children(id, describedBy)}
      {hint && <p id={hintId} className="mt-1.5 text-xs text-white/50 font-light">{hint}</p>}
      {error && <p id={errorId} role="alert" className="mt-1.5 text-xs text-red-300 font-light">{error}</p>}
    </div>
  );
}

const inputCls = "gj-theme-input w-full bg-black text-white border-2 border-white/50 rounded-[10px] px-4 py-2.5 text-base font-light tracking-wide placeholder:text-white/30 focus:border-white/90 focus:outline-none aria-[invalid=true]:border-red-400";

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TextInput(props, ref) {
    return <input ref={ref} {...props} className={cn(inputCls, props.className)} />;
  },
);

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextArea(props, ref) {
    return <textarea ref={ref} rows={props.rows ?? 4} {...props} className={cn(inputCls, props.className)} />;
  },
);

export function CheckboxRow({ id, checked, onChange, children, required, describedBy }: {
  id?: string; checked: boolean; onChange: (v: boolean) => void; children: ReactNode; required?: boolean; describedBy?: string;
}) {
  const autoId = useId();
  const finalId = id || autoId;
  return (
    <div className="mb-4 flex items-start gap-3">
      <input
        id={finalId}
        type="checkbox"
        checked={checked}
        required={required}
        aria-describedby={describedBy}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-[#B49B73] cursor-pointer"
      />
      <label htmlFor={finalId} className="text-sm font-light text-white/85 leading-relaxed cursor-pointer">
        {children}
      </label>
    </div>
  );
}

// -------------------------------------------------------------------- states

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div aria-live="polite" className="flex items-center justify-center gap-3 py-16 text-white/70">
      <span className="inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white motion-safe:animate-spin" aria-hidden="true" />
      <span className="text-xs font-sans uppercase tracking-[0.2em]">{label}…</span>
    </div>
  );
}

export function StateBanner({ kind, children }: { kind: "error" | "success" | "info" | "warn"; children: ReactNode }) {
  const palette = {
    error: "border-red-400/80 text-red-200",
    success: "border-white/90 text-white",
    info: "border-white/40 text-white/80",
    warn: "border-amber-300/80 text-amber-100",
  }[kind];
  return (
    <div role={kind === "error" ? "alert" : "status"} className={cn("gj-theme-panel border-2 rounded-[10px] bg-black px-4 py-3 text-sm font-light tracking-wide mb-5", palette)}>
      {children}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="gj-theme-panel border-2 border-white/30 rounded-[10px] px-6 py-14 text-center">
      <p className="gj-display text-lg font-galvji-light tracking-extra-wide text-white/90">{title}</p>
      {children && <div className="mt-3 text-sm text-white/60 font-light">{children}</div>}
    </div>
  );
}

// -------------------------------------------------------------------- layout

export function EventsLayout({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="gj-com-events min-h-screen bg-[#181818] text-[#F5F1E6] selection:bg-[#B49B73] selection:text-black flex flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:text-black focus:px-4 focus:py-2 focus:rounded-[10px] text-sm">
        Skip to content
      </a>
      <PublicSiteHeader />
      <main id="main" className={cn("flex-1 w-full mx-auto px-4 pt-12 pb-20 md:pt-16", wide ? "max-w-6xl" : "max-w-4xl")}>
        {children}
      </main>
      <PublicSiteFooter />
    </div>
  );
}
