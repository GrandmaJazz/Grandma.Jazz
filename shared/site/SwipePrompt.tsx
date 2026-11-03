import styles from './SwipePrompt.module.css';
import { BRICK_FRAME, BRICK_WIDTH, BRICK_HEIGHT } from '../../apps/grandmajazz-platform/shared/family-original/brickArtwork';

// Reuse the supplied badge's solid outer contour, without its interior cutout.
const brickOutline = BRICK_FRAME.match(/<g fill="#000"><path d="([^"]+)" transform="translate\(([^,]+),([^)]+)\)"/)!;

/** A shared gesture demonstration, not a slider or a separate control. */
export function SwipePrompt({ label, detail }: { label: string; detail?: string }) {
  return <span className={styles.prompt}>
    <svg className={styles.gesture} viewBox="0 0 120 24" fill="none" aria-hidden="true">
      <path d="M8 12h104M14 6l-6 6 6 6M106 6l6 6-6 6" />
      <g className={styles.brick}>
        <svg x="0" y="9.392" width="16" height="5.216" viewBox={`0 0 ${BRICK_WIDTH} ${BRICK_HEIGHT}`}>
          <path d={brickOutline[1]} transform={`translate(${brickOutline[2]},${brickOutline[3]})`} />
        </svg>
      </g>
    </svg>
    <span className={styles.label}>{label}</span>
    {detail && <span className={styles.detail}>{detail}</span>}
  </span>;
}
