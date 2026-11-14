'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { SwipeGesture, SWIPE_RAIL_START, SWIPE_RAIL_END } from '../../shared/site/SwipePrompt';
import styles from '../../shared/site/SwipePrompt.module.css';
import { railDrive } from '@/lib/carouselMotion';

export default function CarouselSpeedControl({ name, label = 'Hold and slide to browse', disabled = false, onDrive, onStep }: {
  name: string;
  label?: string;
  disabled?: boolean;
  onDrive: (speed: number, seconds: number, heldSeconds: number) => void;
  onStep: (direction: -1 | 1) => void;
}) {
  const instructionId = useId();
  const controlRef = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);
  const frame = useRef(0);
  const positionRef = useRef(0);
  const drive = useRef(onDrive);
  drive.current = onDrive;
  const [held, setHeld] = useState(false);
  // A null position shows the animated hint until the visitor takes control.
  const [position, setPosition] = useState<number | null>(null);

  const stop = useCallback(() => {
    const id = pointer.current;
    if (id === null) return;
    pointer.current = null;
    cancelAnimationFrame(frame.current);
    // Stop driving the cards, but leave the handle where it was released.
    drive.current(0, 0, 0);
    setHeld(false);
    const control = controlRef.current;
    if (control?.hasPointerCapture(id)) control.releasePointerCapture(id);
  }, []);

  useEffect(() => {
    const cancel = () => { if (document.hidden) stop(); };
    window.addEventListener('blur', stop);
    document.addEventListener('visibilitychange', cancel);
    return () => {
      cancelAnimationFrame(frame.current);
      window.removeEventListener('blur', stop);
      document.removeEventListener('visibilitychange', cancel);
    };
  }, [stop]);
  useEffect(() => { if (disabled) stop(); }, [disabled, stop]);

  const update = (clientX: number) => {
    const bounds = controlRef.current?.getBoundingClientRect();
    if (!bounds?.width) return;
    const x = (clientX - bounds.left) / bounds.width * 120;
    const fraction = (x - SWIPE_RAIL_START) / (SWIPE_RAIL_END - SWIPE_RAIL_START);
    positionRef.current = Math.max(-1, Math.min(1, fraction * 2 - 1));
    setPosition(positionRef.current);
  };

  const restingPosition = position ?? 0;

  return <div className={styles.prompt}>
    <div
      ref={controlRef}
      role="slider"
      aria-label={name}
      aria-describedby={instructionId}
      aria-disabled={disabled || undefined}
      aria-valuemin={-100}
      aria-valuemax={100}
      aria-valuenow={Math.round(restingPosition * 100)}
      aria-valuetext={!held || Math.abs(restingPosition) <= .06 ? 'Stopped' : `${restingPosition > 0 ? 'Right' : 'Left'}, ${Math.round(Math.abs(restingPosition) * 100)} percent`}
      tabIndex={disabled ? -1 : 0}
      className={styles.control}
      data-carousel-speed=""
      data-held={held}
      onPointerDown={event => {
        if (disabled || !event.isPrimary || event.button !== 0 || pointer.current !== null) return;
        event.stopPropagation();
        event.currentTarget.focus({ preventScroll: true });
        pointer.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        setHeld(true);
        update(event.clientX);
        let previous = performance.now();
        let heldSeconds = 0;
        let direction = 0;
        const tick = (now: number) => {
          if (pointer.current === null) return;
          const speed = railDrive(positionRef.current);
          const seconds = Math.min(0.05, (now - previous) / 1000);
          const nextDirection = Math.sign(speed);
          if (direction !== nextDirection || nextDirection === 0) heldSeconds = 0;
          direction = nextDirection;
          if (direction) heldSeconds += seconds;
          drive.current(speed, seconds, heldSeconds);
          previous = now;
          frame.current = requestAnimationFrame(tick);
        };
        frame.current = requestAnimationFrame(tick);
      }}
      onPointerMove={event => {
        if (event.pointerId === pointer.current) update(event.clientX);
      }}
      onPointerUp={event => {
        if (event.pointerId !== pointer.current) return;
        update(event.clientX);
        stop();
      }}
      onPointerCancel={event => { if (event.pointerId === pointer.current) stop(); }}
      onLostPointerCapture={event => { if (event.pointerId === pointer.current) stop(); }}
      onKeyDown={event => {
        if (disabled || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
        event.preventDefault();
        event.stopPropagation();
        onStep(event.key === 'ArrowLeft' ? -1 : 1);
      }}
    >
      <SwipeGesture position={position !== null || disabled ? (restingPosition + 1) / 2 : undefined} active={held} resumeHint={!disabled} />
    </div>
    <span className={styles.label}>{label}</span>
    <span id={instructionId} className={styles.detail}>Hold farther from the centre to scroll faster. Release to stop. Use the left and right arrow keys to browse.</span>
  </div>;
}
