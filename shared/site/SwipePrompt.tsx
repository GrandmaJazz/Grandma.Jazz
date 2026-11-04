import styles from './SwipePrompt.module.css';
import { BRICK_SILHOUETTE as brick } from './brickSilhouette';

/** The same brick, stroke and timing for horizontal and vertical gestures.
 * A position turns the demonstration into a value indicator (0–1).
 */
export function SwipeGesture({ vertical = false, position }: { vertical?: boolean; position?: number }) {
  return <svg className={`${styles.gesture} ${vertical ? styles.vertical : ''}`} viewBox={vertical ? '0 0 24 120' : '0 0 120 24'} fill="none" aria-hidden="true">
    <g transform={vertical ? 'translate(0 120) rotate(-90)' : undefined}>
      <path d="M8 12h104M14 6l-6 6 6 6M106 6l6 6-6 6" />
      <g className={styles.brick} style={position === undefined ? undefined : { animation: 'none', transform: `translateX(${22 + 60 * Math.max(0, Math.min(1, position))}px)` }}>
        <svg x="0" y="9.392" width="16" height="5.216" viewBox={`0 0 ${brick.width} ${brick.height}`}>
          <path d={brick.path} transform={`translate(${brick.translateX},${brick.translateY})`} />
        </svg>
      </g>
    </g>
  </svg>;
}

/** A shared gesture demonstration, not a slider or a separate control. */
export function SwipePrompt({ label, detail }: { label: string; detail?: string }) {
  return <span className={styles.prompt}>
    <SwipeGesture />
    <span className={styles.label}>{label}</span>
    {detail && <span className={styles.detail}>{detail}</span>}
  </span>;
}
