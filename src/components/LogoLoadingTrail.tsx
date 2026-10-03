/** Shared by the first server paint and the hydrated loader. */
export default function LogoLoadingTrail({ width = 220 }: { width?: number }) {
  const height = width * 652 / 2000;
  const inset = height * 0.03002;
  const radius = height * 0.11656;
  const layers = 72;
  const tailLength = 20;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true" className="absolute inset-0 pointer-events-none"
      style={{ filter: 'drop-shadow(0 0 5px rgba(255,255,255,.8)) drop-shadow(0 0 9px rgba(255,255,255,.35))' }}>
      {/* Nested, continuous strokes share one animation. Their cumulative
          opacity makes a smooth fade along the path, including its corners.
          Every stroke ends at the same head; the tail follows behind it. */}
      <g className="gj-logo-trail-segment" fill="none" stroke="white"
        strokeWidth={Math.max(1.5, height * 0.0184)} strokeLinecap="butt" strokeDashoffset="0">
        <animate attributeName="stroke-dashoffset" from="0" to="-100"
          dur="2.4s" calcMode="linear" repeatCount="indefinite" />
        {Array.from({ length: layers }, (_, index) => {
          const length = tailLength * (1 - index / layers);
          const previousOpacity = 0.98 * index / layers;
          const opacity = (0.98 / layers) / (1 - previousOpacity);
          return <rect key={index} x={inset} y={inset} width={width - inset * 2}
            height={height - inset * 2} rx={radius} ry={radius} pathLength={100}
            strokeOpacity={opacity} strokeDasharray={`0 ${100 - length} ${length} 0`} />;
        })}
      </g>
    </svg>
  );
}
