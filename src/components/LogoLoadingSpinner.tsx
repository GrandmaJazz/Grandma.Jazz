'use client';

// On-brand replacement for the old generic gold-ring + ♪ spinner. Uses the
// actual Grandma Jazz wordmark (public/images/Grandma-Jazz-Logo.webp — a
// rounded-rect badge with a white outline baked into the image) dimmed to a
// greyed-out resting state, with a brighter light trail chasing around that
// same outline as the loading cue — the badge's own border becomes the
// spinner track instead of an unrelated circle-and-music-note icon.
//
// The trail is a single SVG <rect> stroke animated via stroke-dasharray /
// stroke-dashoffset (SMIL <animate>), which moves the highlight at a
// constant rate along the shape's true path LENGTH rather than a
// conic-gradient's constant *angular* rate (a first version used that
// approach — it distorts badly on a wide, short rounded-rect like this
// ~3:1 badge, since the corners subtend a tiny slice of the 360° sweep
// compared to the long flat edges).
//
// That SVG-path fix alone turned out not to be sufficient by itself,
// though — confirmed still visibly cutting corners on two real devices
// even after it shipped. Root cause of THAT: the ring's own corner radius
// was a guessed fraction of height (42%) with no relation to the actual
// image's real corner radius, so the trail was tracing a much *tighter*
// curve than the badge's real, more gradual corner — the technique was
// geometrically smooth for its own (wrong) path, which just isn't the
// same path as the image's real border.
//
// Fixed by directly measuring the real asset: sampled the image's pixel
// data along the top-left corner (leftmost white-pixel x per row) and fit
// a circle to it (Kasa algebraic fit, 41 points, residual < 0.6px — a
// clean circular arc, not guessed). Also measured the border's stroke
// thickness directly (scanned a flat edge, away from any corner). Results,
// as fractions of the image's real height (652px) so they hold at any
// render size given object-contain keeps the aspect ratio locked:
//   outer corner radius   86px  -> 0.1319 of height
//   outer edge flat inset  9.57px -> 0.01468 of height
//   border stroke width   20px  -> 0.03067 of height
// The trail's own stroke rides the border's CENTERLINE (outer values
// adjusted inward by half the border thickness), at 60% of the border's
// own thickness so it reads as a distinct traveling highlight rather than
// fully repainting the border.
const LOGO_SRC = '/images/Grandma-Jazz-Logo.webp';
const LOGO_ASPECT_RATIO = 2000 / 652; // actual asset dimensions
const CENTERLINE_RADIUS_FRAC = 0.11656;
const CENTERLINE_INSET_FRAC = 0.03002;
const TRAIL_STROKE_FRAC = 0.0184;
const MIN_STROKE_WIDTH_PX = 1.5; // floor so the trail stays visible at small render sizes

interface LogoLoadingSpinnerProps {
  className?: string;
  /** Rendered width in px — height follows the logo's real aspect ratio. */
  width?: number;
}

export default function LogoLoadingSpinner({ className = '', width = 220 }: LogoLoadingSpinnerProps) {
  const height = width / LOGO_ASPECT_RATIO;

  // Every measurement below is a fraction of `height`, not `width` — the
  // real image's border proportions are uniform pixels at a single scale
  // factor (height / 652), applied identically on both axes, since
  // object-contain keeps the container's aspect ratio exactly locked to
  // the image's own. Deriving inset/radius from width (as an earlier
  // version did for the horizontal inset) introduces exactly the kind of
  // mismatched-basis error that caused this bug in the first place.
  const inset = height * CENTERLINE_INSET_FRAC;
  const strokeWidth = Math.max(MIN_STROKE_WIDTH_PX, height * TRAIL_STROKE_FRAC);
  const radius = height * CENTERLINE_RADIUS_FRAC;

  const rectX = inset;
  const rectY = inset;
  const rectW = width - inset * 2;
  const rectH = height - inset * 2;

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
