'use client';

// On-brand replacement for the old generic gold-ring + ♪ spinner. Uses the
// actual Grandma Jazz wordmark (public/images/Grandma-Jazz-Logo.webp — a
// rounded-rect badge with a white outline baked into the image) dimmed to a
// greyed-out resting state, with a brighter light trail chasing around that
// same outline as the loading cue — the badge's own border becomes the
// spinner track instead of an unrelated circle-and-music-note icon.
//
// The chasing trail is a separate overlay ring (conic-gradient masked down
// to just its edge, animated via @property so the browser can interpolate
// the angle smoothly) sized/rounded to sit right on top of the image's own
// border rather than trying to animate the raster image's baked-in pixels
// directly.

const LOGO_SRC = '/images/Grandma-Jazz-Logo.webp';
const LOGO_ASPECT_RATIO = 2000 / 652; // actual asset dimensions

interface LogoLoadingSpinnerProps {
  className?: string;
  /** Rendered width in px — height follows the logo's real aspect ratio. */
  width?: number;
}

export default function LogoLoadingSpinner({ className = '', width = 220 }: LogoLoadingSpinnerProps) {
  const height = width / LOGO_ASPECT_RATIO;
  // Matches the image's own corner rounding closely enough at any size
  // since it's a fixed fraction of the (aspect-locked) rendered height.
  const radius = height * 0.42;

  return (
    <div className={`relative inline-block ${className}`} style={{ width, height }}>
      {/* Greyed-out resting logo */}
      <img
        src={LOGO_SRC}
        alt="Grandma Jazz"
        className="w-full h-full object-contain grayscale opacity-40"
        draggable={false}
      />

      {/* Animated light trail tracing the logo's own border */}
      <div
        className="logo-loading-trail absolute pointer-events-none"
        style={{ inset: '3%', borderRadius: radius }}
      />

      <style jsx>{`
        @property --angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        .logo-loading-trail {
          padding: 2px;
          background: conic-gradient(
            from var(--angle),
            transparent 0deg,
            transparent 250deg,
            rgba(255, 255, 255, 0.95) 335deg,
            rgba(255, 255, 255, 0.95) 355deg,
            transparent 360deg
          );
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          animation: logo-loading-rotate 2.2s linear infinite;
        }
        @keyframes logo-loading-rotate {
          to {
            --angle: 360deg;
          }
        }
      `}</style>
    </div>
  );
}
