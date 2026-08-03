'use client';

// On-brand replacement for the old generic gold-ring + ♪ spinner. Uses the
// actual Grandma Jazz wordmark (public/images/Grandma-Jazz-Logo.webp — a
// rounded-rect badge with a white outline baked into the image) dimmed to a
// greyed-out resting state, with a brighter light trail chasing around that
// same outline as the loading cue — the badge's own border becomes the
// spinner track instead of an unrelated circle-and-music-note icon.
//
// The trail is a single SVG <rect> stroke animated via stroke-dasharray /
// stroke-dashoffset (SMIL <animate>), not a conic-gradient mask. A first
// version used a conic-gradient ring, which sweeps at a constant *angular*
// rate from the shape's center — fine for a circle/square, but this badge
// is a wide, short rounded-rect (~3:1), so the rounded corners subtend a
// tiny slice of the 360° sweep compared to the long flat edges: the bright
// band crossed each corner almost instantly, reading as a diagonal
// "shortcut" across the corner instead of tracing its curve (confirmed via
// screen recording). An SVG rect stroke moves the highlight at a constant
// rate along the shape's actual path LENGTH, which — because the browser
// renders the rect's rx/ry corners as true arcs — hugs the real corner
// radius exactly, with no shortcutting.
//
// object-fit: contain fits the whole image at the same scale on every
// device, so the rect's geometry below (matched by eye to the image's own
// border in dev) holds regardless of viewport size.

const LOGO_SRC = '/images/Grandma-Jazz-Logo.webp';
const LOGO_ASPECT_RATIO = 2000 / 652; // actual asset dimensions

interface LogoLoadingSpinnerProps {
  className?: string;
  /** Rendered width in px — height follows the logo's real aspect ratio. */
  width?: number;
}

export default function LogoLoadingSpinner({ className = '', width = 220 }: LogoLoadingSpinnerProps) {
  const height = width / LOGO_ASPECT_RATIO;

  // Ring bounding box — inset from the container edge to sit on top of the
  // image's own painted border, same 3% inset as the resting logo's frame.
  const inset = width * 0.03;
  const strokeWidth = Math.max(2, width * 0.012);
  const rectX = inset + strokeWidth / 2;
  const rectY = inset + strokeWidth / 2;
  const rectW = width - inset * 2 - strokeWidth;
  const rectH = height - inset * 2 - strokeWidth;
  // Matches the image's own corner rounding closely enough at any size
  // since it's a fixed fraction of the (aspect-locked) rendered height.
  const radius = Math.min(height * 0.42, rectH / 2, rectW / 2);

  // True perimeter of a rounded rect: two pairs of straight edges (each
  // shortened by the corner radius on both ends) plus four quarter-circle
  // arcs, i.e. one full circle's circumference, at that radius.
  const perimeter = 2 * (rectW + rectH) - 8 * radius + 2 * Math.PI * radius;
  const dashLength = perimeter * 0.16; // visible "comet" length

  return (
    <div className={`relative inline-block ${className}`} style={{ width, height }}>
      {/* Greyed-out resting logo */}
      <img
        src={LOGO_SRC}
        alt="Grandma Jazz"
        className="w-full h-full object-contain grayscale opacity-40"
        draggable={false}
      />

      {/* Animated light trail tracing the logo's own border, corners included */}
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="absolute inset-0 pointer-events-none"
        style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.7))' }}
      >
        <rect
          x={rectX}
          y={rectY}
          width={rectW}
          height={rectH}
          rx={radius}
          ry={radius}
          fill="none"
          stroke="rgba(255,255,255,0.95)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${dashLength} ${perimeter - dashLength}`}
        >
          <animate
            attributeName="stroke-dashoffset"
            from="0"
            to={-perimeter}
            dur="2.2s"
            repeatCount="indefinite"
          />
        </rect>
      </svg>
    </div>
  );
}
