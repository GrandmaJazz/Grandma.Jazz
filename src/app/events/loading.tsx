/** Stream the site shell immediately while live event availability is fetched. */
export default function EventsLoading() {
  return <main className="min-h-screen bg-[#181818] px-4 pb-16 pt-28 text-[#F5F1E6]" aria-busy="true">
    <div className="mx-auto max-w-4xl">
      <h1 className="gj-display-title mb-6 text-center">Events</h1>
      <p role="status" className="mb-10 text-center font-suisse-intl text-sm text-[#F5F1E6]/65">Finding the latest sessions and availability…</p>
      <div aria-hidden="true" className="space-y-5">
        {[0, 1, 2].map(index => <div key={index} className="rounded-box border border-[#B49B73]/20 p-6 sm:p-8">
          <div className="mb-4 h-5 w-2/3 rounded bg-[#B49B73]/15 motion-safe:animate-pulse" />
          <div className="h-3 w-1/2 rounded bg-[#F5F1E6]/10" />
          <div className="mt-5 h-3 w-4/5 rounded bg-[#F5F1E6]/10" />
        </div>)}
      </div>
    </div>
  </main>;
}
