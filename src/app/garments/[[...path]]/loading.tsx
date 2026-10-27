/** Keep navigation responsive without caching editions or interrupting music. */
export default function GarmentsLoading() {
  return <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#0A0A0A] px-6 pb-16 pt-28 text-[#F5F1E6]" aria-busy="true">
    <h1 className="font-editorial-ultralight text-5xl sm:text-6xl">Garments</h1>
    <div aria-hidden="true" className="h-48 w-36 rounded-control border border-[#B49B73]/35 bg-[#B49B73]/5 motion-safe:animate-pulse" />
    <p role="status" className="font-suisse-intl text-sm text-[#F5F1E6]/65">Opening the magazine…</p>
  </main>;
}
