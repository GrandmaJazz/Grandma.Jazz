import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Ordering from abroad — Delivery & Shopping Help',
  description: 'Currency, delivery quotes and help ordering Grandma Jazz merchandise from outside Thailand.',
  alternates: { canonical: '/shipping/' },
};

export default function ShippingPage() {
  return (
    <section className="min-h-screen bg-[#181818] px-5 pb-20 pt-32 text-[#F5F1E6]">
      <div className="mx-auto max-w-3xl space-y-8 font-suisse-intl leading-relaxed">
        <h1 className="font-editorial-ultralight text-4xl sm:text-5xl">A little Grandma Jazz, wherever you are.</h1>
        <p className="text-[#F5F1E6]/75">Ordering merchandise from outside Thailand? Here are the details to check before you pay.</p>
        <p className="rounded-control border border-[#B49B73]/50 p-4 text-[#B49B73]">Our delivery rates are being reviewed. Please contact the shop for an overseas delivery quote before paying.</p>
        <div className="space-y-7 border-y border-[#F5F1E6]/20 py-8">
          <div><h2 className="text-xl text-[#B49B73]">Prices are in US dollars</h2><p className="mt-2 text-[#F5F1E6]/75">The main shop and its card checkout use USD. Your bank may convert the payment into your account currency.</p></div>
          <div><h2 className="text-xl text-[#B49B73]">Check delivery for your destination</h2><p className="mt-2 text-[#F5F1E6]/75">Choose your country at checkout. Delivery is calculated for the packed order, rather than separately for each item. A valid delivery quote is required before payment; availability depends on the destination and parcel.</p></div>
          <div><h2 className="text-xl text-[#B49B73]">Need a delivery quote or product details?</h2><p className="mt-2 text-[#F5F1E6]/75">If checkout cannot quote your destination, or you need sizing, delivery timing or returns information, contact us before ordering. Include the product name and destination country so we can help.</p><div className="mt-5 flex flex-wrap gap-3"><a href="mailto:grandmajazzphuket@gmail.com?subject=Overseas%20merchandise%20order" className="gj-cta">Email the shop</a><a href="https://wa.me/66948605652" target="_blank" rel="noopener noreferrer" className="gj-cta gj-cta--quiet">WhatsApp</a></div></div>
          <div><h2 className="text-xl text-[#B49B73]">Shopping Garments?</h2><p className="mt-2 text-[#F5F1E6]/75">Explore the <Link href="/garments/" className="text-[#B49B73] underline underline-offset-4">Garments magazine</Link>, our clothing lookbook. To order a piece, <a href="https://www.instagram.com/garments_grandmajazz/" target="_blank" rel="noopener noreferrer" className="text-[#B49B73] underline underline-offset-4">ask Garments about availability</a>, measurements, price and delivery. Magazine editions are not a clothing checkout.</p></div>
        </div>
        <Link href="/products/" className="gj-cta">Browse the shop</Link>
      </div>
    </section>
  );
}
