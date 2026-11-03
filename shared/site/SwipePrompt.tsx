import styles from './SwipePrompt.module.css';
import { BRICK_SILHOUETTE as brick } from './brickSilhouette';

/** A shared gesture demonstration, not a slider or a separate control. */
export function SwipePrompt({ label, detail }: { label: string; detail?: string }) {
  return <span className={styles.prompt}>
    <svg className={styles.gesture} viewBox="0 0 120 24" fill="none" aria-hidden="true">
      <path d="M8 12h104M14 6l-6 6 6 6M106 6l6 6-6 6" />
      <g className={styles.brick}>
        <svg x="0" y="9.392" width="16" height="5.216" viewBox={`0 0 ${brick.width} ${brick.height}`}>
          <path d={brick.path} transform={`translate(${brick.translateX},${brick.translateY})`} />
        </svg>
      </g>
    </svg>
    <span className={styles.label}>{label}</span>
    {detail && <span className={styles.detail}>{detail}</span>}
  </span>;
}
