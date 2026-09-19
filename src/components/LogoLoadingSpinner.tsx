"use client";

// On-brand replacement for the old generic gold-ring + ♪ spinner. Uses the
// actual Grandma Jazz wordmark (public/images/Grandma-Jazz-Logo-Heavier.webp — a
// rounded-rect badge with a white outline baked into the image) dimmed to a
// greyed-out resting state, with a brighter light trail chasing around that
// same outline as the loading cue — the badge's own border becomes the
// spinner track instead of an unrelated circle-and-music-note icon.
//
// The trail is a short stack of SVG <rect> strokes with progressively lower
// opacity and width. Together they read as one tapered comet rather than a
// solid white snake. stroke-dashoffset moves the highlight at a constant rate
// along the shape's true path LENGTH rather than a
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
const LOGO_SRC = "/images/Grandma-Jazz-Logo-Heavier.webp";
const LOGO_ASPECT_RATIO = 2000 / 652; // actual asset dimensions
const CENTERLINE_RADIUS_FRAC = 0.11656;
const CENTERLINE_INSET_FRAC = 0.03002;
const TRAIL_STROKE_FRAC = 0.0184;
const MIN_STROKE_WIDTH_PX = 1.5; // floor so the trail stays visible at small render sizes
const TRAIL_DURATION = "2.4s";
const TRAIL_SEGMENTS = [
  { offset: 0, length: 3.8, opacity: 1, width: 1 },
  { offset: 3.5, length: 3.8, opacity: 0.7, width: 0.88 },
  { offset: 7, length: 4, opacity: 0.45, width: 0.75 },
  { offset: 10.7, length: 4.3, opacity: 0.25, width: 0.62 },
  { offset: 14.7, length: 4.6, opacity: 0.1, width: 0.5 },
] as const;

interface LogoLoadingSpinnerProps {
  className?: string;
  /** Rendered width in px — height follows the logo's real aspect ratio. */
  width?: number;
}

export default function LogoLoadingSpinner({
  className = "",
  width = 220,
}: LogoLoadingSpinnerProps) {
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

  return (
    <div
      className={`relative inline-block ${className}`}
      style={{ width, height }}
    >
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
        style={{ filter: "drop-shadow(0 0 4px rgba(255,255,255,0.7))" }}
      >
        {TRAIL_SEGMENTS.map((segment) => (
          <rect
            key={segment.offset}
            className="gj-logo-trail-segment"
            x={rectX}
            y={rectY}
            width={rectW}
            height={rectH}
            rx={radius}
            ry={radius}
            pathLength={100}
            fill="none"
            stroke="white"
            strokeOpacity={segment.opacity}
            strokeWidth={strokeWidth * segment.width}
            strokeLinecap="round"
            strokeDasharray={`${segment.length} ${100 - segment.length}`}
            strokeDashoffset={-segment.offset}
          >
            <animate
              attributeName="stroke-dashoffset"
              from={-segment.offset}
              to={-segment.offset - 100}
              dur={TRAIL_DURATION}
              calcMode="linear"
              repeatCount="indefinite"
            />
          </rect>
        ))}
      </svg>
    </div>
  );
}
