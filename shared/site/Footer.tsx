'use client';

import { useId, type ElementType } from 'react';

import "./site-chrome.css";
import { useLogoPulse } from "./useLogoPulse";

import {
  BUSINESS_HOURS,
  GOOGLE_MAPS_URL,
  SPOTIFY_PLAYLIST_URL,
  YOUTUBE_CHANNEL_URL,
} from '../../src/lib/businessDetails';

function GmailIcon({ pulse }: { pulse: string | undefined }) {
  const id = useId();
  const left = 'M2.7 19V5';
  const right = 'M21.3 5v14';
  const fold = 'M2.7 5 12 12.6 21.3 5';

  return (
    <svg className="gj-footer-icon gj-footer-icon-gmail w-6 h-6 sm:w-7 sm:h-7" data-pulse={pulse} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-leg`} gradientUnits="userSpaceOnUse" x1="21.3" y1="5" x2="21.3" y2="19">
          <stop stopColor="#34a853" />
          <stop offset=".5" stopColor="#00a877" />
          <stop offset="1" stopColor="#4285f4" />
        </linearGradient>
        <linearGradient id={`${id}-fold`} gradientUnits="userSpaceOnUse" x1="2" y1="5" x2="22" y2="5">
          <stop stopColor="#ff5387" />
          <stop offset=".3" stopColor="#ff3d35" />
          <stop offset=".67" stopColor="#ff3d35" />
          <stop offset="1" stopColor="#fbbc04" />
        </linearGradient>
      </defs>
      <g stroke="currentColor" strokeWidth="5.4" strokeLinecap="round" strokeLinejoin="round">
        <path d={left} />
        <path d={right} />
        <path d={fold} />
        <g className="gj-footer-brand-layer">
          <path d={left} stroke="#ff3d35" />
          <path d={right} stroke={`url(#${id}-leg)`} />
          <path d={fold} stroke={`url(#${id}-fold)`} />
        </g>
      </g>
    </svg>
  );
}

function MapsIcon({ pulse }: { pulse: string | undefined }) {
  const id = useId();
  const pin = 'M12 0.7a9.4 9.4 0 0 0-9.4 9.4c0 5.1 5.2 7.6 8.3 12.7a1.25 1.25 0 0 0 2.2 0c3.1-5.1 8.3-7.6 8.3-12.7A9.4 9.4 0 0 0 12 0.7Zm0 4.3a5.1 5.1 0 1 1 0 10.2A5.1 5.1 0 0 1 12 5Z';

  return (
    <svg className="gj-footer-icon gj-footer-icon-maps w-6 h-6 sm:w-7 sm:h-7" data-pulse={pulse} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-pin`} gradientUnits="userSpaceOnUse" x1="3.5" y1="4" x2="16" y2="17">
          <stop stopColor="#ff4b85" />
          <stop offset=".23" stopColor="#fa4137" />
          <stop offset=".44" stopColor="#fbbc04" />
          <stop offset=".65" stopColor="#09bd69" />
          <stop offset="1" stopColor="#0fa958" />
        </linearGradient>
        <radialGradient id={`${id}-blue`} gradientUnits="userSpaceOnUse" cx="15" cy="2" r="11">
          <stop stopColor="#4285f4" />
          <stop offset=".5" stopColor="#4285f4" stopOpacity=".95" />
          <stop offset="1" stopColor="#4285f4" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d={pin} fill="currentColor" fillRule="evenodd" />
      <g className="gj-footer-brand-layer" fillRule="evenodd">
        <path d={pin} fill={`url(#${id}-pin)`} />
        <path d={pin} fill={`url(#${id}-blue)`} />
      </g>
    </svg>
  );
}

export const SiteFooter = ({ linkComponent: NavigationLink = "a", homepage = false }: { linkComponent?: ElementType; homepage?: boolean } = {}) => {
  const { group, phase } = useLogoPulse(6);
  const instagramGradient = useId();
  return (
    <>
      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      <div
        className="gj-site-chrome gj-site-contact relative w-full bg-[#181818] flex flex-col items-center justify-center py-16 sm:py-24 lg:py-32 overflow-hidden"
      >
      <div className="relative max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-md mx-auto mb-10 lg:mb-14">
          <p className="gj-section-copy mb-6">
            Follow us on Instagram for the latest updates, behind-the-scenes content, and special announcements.
          </p>
          <NavigationLink
            href="https://instagram.com/grandmajazzphuket"
            target="_blank"
            rel="noopener noreferrer"
            className="gj-cta"
          >
            <svg className="gj-footer-icon gj-footer-icon-instagram" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
              <defs>
                <linearGradient id={instagramGradient} gradientUnits="userSpaceOnUse" x1="4" y1="22" x2="20" y2="2">
                  <stop stopColor="#ffdc80" />
                  <stop offset=".27" stopColor="#f77737" />
                  <stop offset=".52" stopColor="#e1306c" />
                  <stop offset=".76" stopColor="#c13584" />
                  <stop offset="1" stopColor="#833ab4" />
                </linearGradient>
              </defs>
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.6" cy="6.6" r="1" fill="currentColor" stroke="none" />
              <g className="gj-footer-brand-layer" stroke={`url(#${instagramGradient})`}>
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.6" cy="6.6" r="1" fill={`url(#${instagramGradient})`} stroke="none" />
              </g>
            </svg>
            Follow us on Instagram
          </NavigationLink>
        </div>
        <div className="relative flex flex-col lg:flex-row items-center justify-center gap-8 sm:gap-10 lg:gap-10 xl:gap-16">
          <div className="relative z-10">
            <iframe
              src="/instagram/?embed=1"
              title="Grandma Jazz Instagram photo gallery"
              loading="lazy"
              className="block border-0 w-[calc(100vw-32px)] max-w-[320px] h-[calc((100vw-32px)*2.06667)] max-h-[660px] sm:w-[280px] sm:h-[550px] md:w-[300px] md:h-[620px] lg:w-[320px] lg:h-[650px]"
            />
          </div>

          <div className="relative z-0 text-center lg:text-left max-w-md lg:max-w-xl">
            <h2 className="gj-display-title mb-6">
              {homepage ? <>Find us. Stay a <span className="gj-title-accent">while</span>.</> : <>Come and <span className="gj-title-accent">find</span> us.</>}
            </h2>

            <p className="gj-section-copy mb-5 max-w-md mx-auto lg:mx-0">
              We’re <strong className="gj-copy-highlight">tucked into the hills above Kamala</strong>. The last turn can be easy to miss, but we’ve made finding Grandma simple.
            </p>
            <p className="gj-section-copy mb-6 max-w-md mx-auto lg:mx-0">
              Check the entrance photo and opening hours, then make your way up.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-8 lg:mb-5 lg:justify-start">
              <NavigationLink href={GOOGLE_MAPS_URL} target="_blank" rel="noopener noreferrer" className="gj-cta">
                Get directions <span aria-hidden="true">→</span>
              </NavigationLink>
              <NavigationLink href="/visit/" className="gj-cta gj-cta--quiet">
                Before you come <span aria-hidden="true">→</span>
              </NavigationLink>
            </div>

            <div className="mb-10 text-center lg:text-left">
              <h3 className="font-label-mono text-[10px] uppercase tracking-[0.32em] text-[#F5F1E6]/45 mb-3">
                Opening hours
              </h3>
              <p className="text-base sm:text-lg text-[#F5F1E6]/75 leading-relaxed">
                {BUSINESS_HOURS.display}
              </p>
              <NavigationLink
                href={GOOGLE_MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="gj-cta mt-4"
              >
                Live hours &amp; holiday updates on Google
                <span aria-hidden="true">→</span>
              </NavigationLink>
            </div>

            <div className="w-full">
              <h3 className="font-label-mono text-[10px] uppercase tracking-[0.32em] text-[#F5F1E6]/45 mb-8 text-center lg:text-left">
                Get in Touch
              </h3>

              <div ref={group} className="grid grid-cols-3 sm:grid-cols-6 gap-4 justify-items-center lg:justify-items-start max-w-md mx-auto lg:mx-0">
                <NavigationLink
                  href="https://wa.me/66948605652"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-[#B49B73]/30 bg-transparent hover:border-[#B49B73] hover:bg-[#B49B73]/10 transition-all duration-200 ease-out hover:scale-110"
                  title="WhatsApp: +66 94 860 5652"
                >
                  <svg className="gj-footer-icon gj-footer-icon-whatsapp w-6 h-6 sm:w-7 sm:h-7" data-pulse={phase(0)} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.893 3.106"/>
                  </svg>
                </NavigationLink>

                <NavigationLink
                  href={YOUTUBE_CHANNEL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-[#B49B73]/30 bg-transparent hover:border-[#B49B73] hover:bg-[#B49B73]/10 transition-all duration-200 ease-out hover:scale-110"
                  title="YouTube Channel"
                >
                  <svg className="gj-footer-icon gj-footer-icon-youtube w-6 h-6 sm:w-7 sm:h-7" data-pulse={phase(1)} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </NavigationLink>

                <NavigationLink
                  href="mailto:grandma@grandmajazz.com"
                  className="group flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-[#B49B73]/30 bg-transparent hover:border-[#B49B73] hover:bg-[#B49B73]/10 transition-all duration-200 ease-out hover:scale-110"
                  title="Email: grandma@grandmajazz.com"
                >
                  <GmailIcon pulse={phase(2)} />
                </NavigationLink>

                <NavigationLink
                  href="tel:+66948605652"
                  className="group flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-[#B49B73]/30 bg-transparent hover:border-[#B49B73] hover:bg-[#B49B73]/10 transition-all duration-200 ease-out hover:scale-110"
                  title="Phone: 094-860-5652"
                >
                  <svg className="gj-footer-icon gj-footer-icon-phone w-6 h-6 sm:w-7 sm:h-7" data-pulse={phase(3)} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                  </svg>
                </NavigationLink>

                <NavigationLink
                  href={SPOTIFY_PLAYLIST_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-[#B49B73]/30 bg-transparent hover:border-[#B49B73] hover:bg-[#B49B73]/10 transition-all duration-200 ease-out hover:scale-110"
                  title="Play Grandma’s Groove on Spotify"
                >
                  <svg className="gj-footer-icon gj-footer-icon-spotify w-6 h-6 sm:w-7 sm:h-7" data-pulse={phase(4)} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                  </svg>
                </NavigationLink>

                <NavigationLink
                  href={GOOGLE_MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-[#B49B73]/30 bg-transparent hover:border-[#B49B73] hover:bg-[#B49B73]/10 transition-all duration-200 ease-out hover:scale-110"
                  title="Find us on Google Maps"
                >
                  <MapsIcon pulse={phase(5)} />
                </NavigationLink>
              </div>

              {/* Site map for people and for crawlers. Before this existed the
                  homepage's server HTML contained exactly one internal link,
                  so Search Console reported "Referring page: None detected"
                  on nearly every page. These render on every page that uses
                  the Contact footer. */}
              <nav aria-label="Site" className="mt-10 w-full">
                <h3 className="font-label-mono text-[10px] uppercase tracking-[0.32em] text-[#F5F1E6]/45 mb-5 text-center lg:text-left">
                  Explore
                </h3>
                <ul className="flex flex-wrap gap-x-6 gap-y-3 justify-center lg:justify-start max-w-md mx-auto lg:mx-0 list-none p-0 m-0">
                  <li><NavigationLink href="/" className="font-label-mono normal-case tracking-[0.12em] text-sm text-[#F5F1E6]/60 hover:text-[#B49B73] transition-colors duration-200">Home</NavigationLink></li>
                  <li><NavigationLink href="/visit/" className="font-label-mono normal-case tracking-[0.12em] text-sm text-[#F5F1E6]/60 hover:text-[#B49B73] transition-colors duration-200">Visit</NavigationLink></li>
                  <li><NavigationLink href="/events/" className="font-label-mono normal-case tracking-[0.12em] text-sm text-[#F5F1E6]/60 hover:text-[#B49B73] transition-colors duration-200">Events</NavigationLink></li>
                  <li><NavigationLink href="/blogs/" className="font-label-mono normal-case tracking-[0.12em] text-sm text-[#F5F1E6]/60 hover:text-[#B49B73] transition-colors duration-200">Journal</NavigationLink></li>
                  <li><NavigationLink href="/products/" className="font-label-mono normal-case tracking-[0.12em] text-sm text-[#F5F1E6]/60 hover:text-[#B49B73] transition-colors duration-200">Shop</NavigationLink></li>
                  <li><NavigationLink href="/shipping/" className="font-label-mono normal-case tracking-[0.12em] text-sm text-[#F5F1E6]/60 hover:text-[#B49B73] transition-colors duration-200">Delivery &amp; shopping help</NavigationLink></li>
                  <li><NavigationLink href="/returns/" className="font-label-mono normal-case tracking-[0.12em] text-sm text-[#F5F1E6]/60 hover:text-[#B49B73] transition-colors duration-200">Returns</NavigationLink></li>
                  <li><NavigationLink href="/terms/" className="font-label-mono normal-case tracking-[0.12em] text-sm text-[#F5F1E6]/60 hover:text-[#B49B73] transition-colors duration-200">Shopping terms</NavigationLink></li>
                  <li><NavigationLink href="/privacy/" className="font-label-mono normal-case tracking-[0.12em] text-sm text-[#F5F1E6]/60 hover:text-[#B49B73] transition-colors duration-200">Privacy &amp; cookies</NavigationLink></li>
                  <li><NavigationLink href="/garments/" className="font-label-mono normal-case tracking-[0.12em] text-sm text-[#F5F1E6]/60 hover:text-[#B49B73] transition-colors duration-200">Garments</NavigationLink></li>
                  <li><NavigationLink href="/family/" className="font-label-mono normal-case tracking-[0.12em] text-sm text-[#F5F1E6]/60 hover:text-[#B49B73] transition-colors duration-200">Family</NavigationLink></li>
                </ul>
              </nav>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
