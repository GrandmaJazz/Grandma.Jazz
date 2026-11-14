'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { SwipeGesture, SWIPE_RAIL_START, SWIPE_RAIL_END } from '../../shared/site/SwipePrompt';
import styles from '../../shared/site/SwipePrompt.module.css';
import { railDrive } from '@/lib/carouselMotion';

export default function CarouselSpeedControl({ name, label = 'Hold and slide to browse', disabled = false, onDrive, onStep }: {
  name: string;
  label?: string;
  disabled?: boolean;
  onDrive: (speed: number, seconds: number) => void;
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
  const [position, setPosition] = useState(0);

  const stop = () => {
    const id = pointer.current;
    pointer.current = null;
    cancelAnimationFrame(frame.current);
    if (id !== null) drive.current(0, 0);
    positionRef.current = 0;
    setPosition(0);
    setHeld(false);
    const control = controlRef.current;
    if (id !== null && control?.hasPointerCapture(id)) control.releasePointerCapture(id);
  };

  useEffect(() => {
    const cancel = () => { if (document.hidden) stop(); };
    window.addEventListener('blur', stop);
    document.addEventListener('visibilitychange', cancel);
    return () => {
      cancelAnimationFrame(frame.current);
      window.removeEventListener('blur', stop);
      document.removeEventListener('visibilitychange', cancel);
    };
  }, []);
  useEffect(() => { if (disabled) stop(); }, [disabled]);

  const update = (clientX: number) => {
    const bounds = controlRef.current?.getBoundingClientRect();
    if (!bounds?.width) return;
    const x = (clientX - bounds.left) / bounds.width * 120;
    const fraction = (x - SWIPE_RAIL_START) / (SWIPE_RAIL_END - SWIPE_RAIL_START);
    positionRef.current = Math.max(-1, Math.min(1, fraction * 2 - 1));
    setPosition(positionRef.current);
  };

  return <div className={styles.prompt}>
    <div
      ref={controlRef}
      role="slider"
      aria-label={name}
      aria-describedby={instructionId}
      aria-disabled={disabled || undefined}
      aria-valuemin={-100}
      aria-valuemax={100}
      aria-valuenow={Math.round(position * 100)}
      aria-valuetext={Math.abs(position) <= .06 ? 'Stopped' : `${position > 0 ? 'Right' : 'Left'}, ${Math.round(Math.abs(position) * 100)} percent`}
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
        const tick = (now: number) => {
          if (pointer.current === null) return;
          drive.current(railDrive(positionRef.current), Math.min(0.05, (now - previous) / 1000));
          previous = now;
          frame.current = requestAnimationFrame(tick);
        };
        frame.current = requestAnimationFrame(tick);
      }}
      onPointerMove={event => {
        if (event.pointerId === pointer.current) update(event.clientX);
      }}
      onPointerUp={event => { if (event.pointerId === pointer.current) stop(); }}
      onPointerCancel={event => { if (event.pointerId === pointer.current) stop(); }}
      onLostPointerCapture={event => { if (event.pointerId === pointer.current) stop(); }}
      onKeyDown={event => {
        if (disabled || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
        event.preventDefault();
        event.stopPropagation();
        onStep(event.key === 'ArrowLeft' ? -1 : 1);
      }}
    >
      <SwipeGesture position={(position + 1) / 2} active={held} />
    </div>
    <span className={styles.label}>{label}</span>
    <span id={instructionId} className={styles.detail}>Hold farther from the centre to scroll faster. Release to stop. Use the left and right arrow keys to browse.</span>
  </div>;
}
