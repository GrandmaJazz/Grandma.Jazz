import { BRICK_FRAME, BRICK_HEIGHT, BRICK_WIDTH } from '@shared/family-original/brickArtwork';

export function BrickButtonFrame() {
  return (
    <svg
      className="brick-button-frame"
      viewBox={`0 0 ${BRICK_WIDTH} ${BRICK_HEIGHT}`}
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
    >
      <g dangerouslySetInnerHTML={{ __html: BRICK_FRAME }} />
    </svg>
  );
}
