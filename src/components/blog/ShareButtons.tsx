// src/components/blog/ShareButtons.tsx
'use client';

import { useState } from 'react';

interface Props {
  url: string;
  title: string;
}

export default function ShareButtons({ url, title }: Props) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Older browsers / non-secure contexts
      const field = document.createElement('textarea');
      field.value = url;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.appendChild(field);
      field.select();
      document.execCommand('copy');
      document.body.removeChild(field);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  async function nativeShare() {
    if (busy) return;
    setBusy(true);
    try {
      await navigator.share({ title, url });
    } catch {
      /* user dismissed — nothing to do */
    }
    setBusy(false);
  }

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const links = [
    {
      name: 'WhatsApp',
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      icon: (
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2Zm5.8 14.16c-.24.68-1.42 1.31-1.95 1.36-.5.05-.98.24-3.3-.69-2.77-1.09-4.54-3.92-4.68-4.1-.14-.19-1.12-1.49-1.12-2.85s.71-2.02.96-2.3c.25-.27.55-.34.73-.34h.53c.17 0 .4-.06.62.48.24.57.8 1.98.87 2.12.07.14.12.31.02.5-.34.68-.7.65-.5.99.75 1.29 1.5 1.74 2.64 2.31.19.1.31.08.42-.05.12-.14.49-.57.62-.77.13-.19.26-.16.44-.1.18.07 1.15.55 1.35.65.2.1.33.14.38.22.05.09.05.5-.19 1.17Z" />
      ),
    },
    {
      name: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: (
        <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.19 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.5-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.45 2.91h-2.33V22c4.78-.75 8.44-4.92 8.44-9.94Z" />
      ),
    },
    {
      name: 'X',
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      icon: (
        <path d="M17.53 3h3.02l-6.6 7.54L21.75 21h-5.9l-4.62-6.04L5.94 21H2.91l7.06-8.07L2.5 3h6.05l4.18 5.52L17.53 3Zm-1.06 16.2h1.67L7.6 4.71H5.81l10.66 14.49Z" />
      ),
    },
    {
      name: 'Email',
      href: `mailto:?subject=${encodedTitle}&body=${encodedUrl}`,
      icon: (
        <path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm9 8.13 8-5.2V6.6l-8 5.2-8-5.2v1.33l8 5.2Z" />
      ),
    },
  ];

  return (
    <div className="gj-share">
      <span className="gj-share__label">Pass it on</span>

      <div className="gj-share__row">
        {canNativeShare && (
          <button type="button" onClick={nativeShare} className="gj-share__btn" aria-label="Share this post">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M13 5.41V16h-2V5.41l-3.3 3.3-1.4-1.42L12 1.59l5.7 5.7-1.4 1.42L13 5.4ZM4 14h2v6h12v-6h2v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6Z" />
            </svg>
            <span>Share</span>
          </button>
        )}

        {links.map((l) => (
          <a
            key={l.name}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="gj-share__btn"
            aria-label={`Share on ${l.name}`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {l.icon}
            </svg>
            <span>{l.name}</span>
          </a>
        ))}

        <button
          type="button"
          onClick={copyLink}
          className={`gj-share__btn${copied ? ' gj-share__btn--done' : ''}`}
          aria-live="polite"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {copied ? (
              <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17Z" />
            ) : (
              <path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1Zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z" />
            )}
          </svg>
          <span>{copied ? 'Link copied' : 'Copy link'}</span>
        </button>
      </div>
    </div>
  );
}
