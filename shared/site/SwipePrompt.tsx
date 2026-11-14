'use client';

import { useId } from 'react';
import styles from './SwipePrompt.module.css';
import { BRICK_SILHOUETTE as brick } from './brickSilhouette';

export const SWIPE_RAIL_START = 16;
export const SWIPE_RAIL_END = 104;

/** The brick silhouette and warm halo are shared by cues and controls. */
export function SwipeGesture({ vertical = false, position, active = false }: {
  vertical?: boolean;
  position?: number;
  active?: boolean;
}) {
  const glowId = useId();
  const start = vertical || position === undefined ? 30 : SWIPE_RAIL_START;
  const end = vertical || position === undefined ? 90 : SWIPE_RAIL_END;
  const x = position === undefined ? undefined : start + (end - start) * Math.max(0, Math.min(1, position)) - 8;
  return <svg className={`${styles.gesture} ${vertical ? styles.vertical : ''}`} viewBox={vertical ? '0 0 24 120' : '0 0 120 24'} fill="none" aria-hidden="true">
    <defs>
      <radialGradient id={glowId}>
        <stop stopColor="#f0ce8c" stopOpacity=".77" />
        <stop offset=".48" stopColor="#d8b87c" stopOpacity=".34" />
        <stop offset="1" stopColor="#b49b73" stopOpacity="0" />
      </radialGradient>
    </defs>
    <g transform={vertical ? 'translate(0 120) rotate(-90)' : undefined}>
      <path d="M8 12h104M14 6l-6 6 6 6M106 6l6 6-6 6" />
      <g className={x === undefined ? styles.demo : undefined} transform={x === undefined ? undefined : `translate(${x} 0)`}>
        <ellipse cx="8" cy="12" rx="26" ry="14" fill={`url(#${glowId})`} className={styles.halo} data-active={active} />
        <svg x="0" y="9.392" width="16" height="5.216" viewBox={`0 0 ${brick.width} ${brick.height}`}>
          <path className={styles.brick} data-active={active} d={brick.path} transform={`translate(${brick.translateX},${brick.translateY})`} />
        </svg>
      </g>
    </g>
  </svg>;
}

export function SwipePrompt({ label, detail }: { label: string; detail?: string }) {
  return <span className={`${styles.prompt} ${styles.passive}`}>
    <SwipeGesture />
    <span className={styles.label}>{label}</span>
    {detail && <span className={styles.detail}>{detail}</span>}
  </span>;
}
