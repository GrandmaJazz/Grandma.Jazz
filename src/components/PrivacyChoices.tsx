'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { clearOptionalStorage, parsePrivacyChoice, permitsAnalytics, PRIVACY_EVENT, PRIVACY_KEY,
  PRIVACY_SETTINGS_EVENT, privacySignal, readPrivacyChoice, savePrivacyChoice, type PrivacyChoice } from '@/lib/privacyChoices';

const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
type TagWindow = Window & { gtag?: (...args: unknown[]) => void; fbq?: (...args: unknown[]) => void; [key: `ga-disable-${string}`]: boolean };

export default function PrivacyChoices() {
  const familyScreen = /^\/family(?:\/|$)/.test(usePathname() || "");
  const [choice, setChoice] = useState<PrivacyChoice | null>(null);
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [signal, setSignal] = useState(false);

  useEffect(() => {
    const update = () => {
      const value = readPrivacyChoice();
      const blocked = privacySignal();
      setSignal(blocked);
      setChoice(value);
      setAnalytics(!blocked && !!value?.analytics);
      setMarketing(!blocked && !!value?.marketing);
      const target = window as unknown as TagWindow;
      const allowAnalytics = permitsAnalytics();
      const allowMarketing = !blocked && value?.marketing === true;
      if (gaId) target[`ga-disable-${gaId}`] = !allowAnalytics;
      target.gtag?.('consent', 'update', { analytics_storage: allowAnalytics ? 'granted' : 'denied',
        ad_storage: allowMarketing ? 'granted' : 'denied', ad_user_data: allowMarketing ? 'granted' : 'denied',
        ad_personalization: allowMarketing ? 'granted' : 'denied' });
      target.fbq?.('consent', allowMarketing ? 'grant' : 'revoke');
      clearOptionalStorage(allowAnalytics, allowMarketing);
    };
    update();
    setOpen(!readPrivacyChoice());
    const settings = () => { setDetails(true); setOpen(true); };
    const storage = (event: StorageEvent) => {
      if (event.key !== PRIVACY_KEY) return;
      (window as Window & { gjPrivacyChoice?: PrivacyChoice }).gjPrivacyChoice = parsePrivacyChoice(event.newValue) ?? undefined;
      update();
      setOpen(!readPrivacyChoice());
    };
    window.addEventListener(PRIVACY_EVENT, update);
    window.addEventListener(PRIVACY_SETTINGS_EVENT, settings);
    window.addEventListener('storage', storage);
    return () => { window.removeEventListener(PRIVACY_EVENT, update); window.removeEventListener(PRIVACY_SETTINGS_EVENT, settings); window.removeEventListener('storage', storage); };
  }, []);

  const save = (allowAnalytics: boolean, allowMarketing: boolean) => {
    setChoice(savePrivacyChoice(allowAnalytics, allowMarketing));
    setOpen(false);
  };
  const allowAnalytics = !signal && choice?.analytics === true;
  const allowMarketing = !signal && choice?.marketing === true;
  return <>
    {gaId && allowAnalytics && <>
      <Script id="gj-google-consent" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};window['ga-disable-${gaId}']=false;gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});gtag('js',new Date());gtag('config','${gaId}',{allow_google_signals:false,allow_ad_personalization_signals:false});`}</Script>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
    </>}
    {pixelId && allowMarketing && <Script id="gj-meta-consent" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('consent','grant');fbq('set','autoConfig',false,'${pixelId}');fbq('init','${pixelId}');fbq('track','PageView');`}</Script>}
    {open && !familyScreen && <aside aria-label="Cookie choices" className="fixed bottom-3 left-3 right-3 z-[10000] mx-auto max-w-3xl rounded-control border border-[#B49B73]/50 bg-[#181818] p-4 font-suisse-intl text-sm text-[#F5F1E6] shadow-xl sm:p-5">
      <p className="text-base text-[#B49B73]">A little choice about cookies.</p>
      <p className="mt-2 leading-relaxed text-[#F5F1E6]/75">We use essential storage for sign-in, your basket and music. Optional Google Analytics helps us understand visits; Meta helps measure advertising. You can browse and shop with both off. <Link href="/privacy/#cookies" className="underline underline-offset-4">Privacy details</Link></p>
      {signal && <p className="mt-2 text-[#B49B73]">Your browser privacy signal keeps optional tracking off.</p>}
      {details && <fieldset className="mt-3 flex flex-wrap gap-x-6 gap-y-3"><legend className="sr-only">Optional cookies</legend>
        <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={analytics} disabled={signal} onChange={event => setAnalytics(event.target.checked)} className="accent-[#B49B73]" />Analytics</label>
        <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={marketing} disabled={signal} onChange={event => setMarketing(event.target.checked)} className="accent-[#B49B73]" />Marketing</label>
      </fieldset>}
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" className="gj-cta gj-cta--quiet" onClick={() => save(false, false)}>Necessary only</button>
        {!signal && <button type="button" className="gj-cta gj-cta--quiet" onClick={() => save(true, true)}>Allow both</button>}
        {details ? <button type="button" className="gj-cta gj-cta--quiet" onClick={() => save(analytics, marketing)}>Save choices</button> : <button type="button" className="gj-cta gj-cta--quiet" onClick={() => setDetails(true)}>Choose separately</button>}
      </div>
    </aside>}
  </>;
}

export function PrivacySettingsButton() {
  return <button type="button" className="underline underline-offset-4 hover:text-[#B49B73]" onClick={() => window.dispatchEvent(new Event(PRIVACY_SETTINGS_EVENT))}>Cookie choices</button>;
}
