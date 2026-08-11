'use client';

import React, { useRef, useState, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  /** How far the element is allowed to drift toward the cursor (px). */
  strength?: number;
}

/**
 * Wraps any content and gives it a subtle "magnetic" pull toward the cursor
 * on hover, then springs back on leave. Used on the primary Store / Event
 * CTAs to make them feel lively without being loud.
 *
 * - Purely presentational: it renders an inline-block wrapper, so an
 *   underlying <Link>/<button> keeps its own click + keyboard behaviour.
 * - Honours prefers-reduced-motion: if the user asked for less motion,
 *   the magnet is disabled entirely and it renders a plain span.
 */
export default function MagneticButton({
  children,
  className = '',
  strength = 14,
}: MagneticButtonProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const prefersReduced = useReducedMotion();

  const handleMove = useCallback(
    (e: React.MouseEvent<HTMLSpanElement>) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // Offset of cursor from the element's centre, clamped to +/- strength.
      const relX = e.clientX - (rect.left + rect.width / 2);
      const relY = e.clientY - (rect.top + rect.height / 2);
      const clamp = (v: number, max: number) => Math.max(-max, Math.min(max, v));
      setPos({ x: clamp(relX, strength), y: clamp(relY, strength) });
    },
    [strength]
  );

  const reset = useCallback(() => setPos({ x: 0, y: 0 }), []);

  if (prefersReduced) {
    return <span className={`inline-block ${className}`}>{children}</span>;
  }

  return (
    <motion.span
      ref={ref}
      className={`inline-block ${className}`}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      animate={{ x: pos.x, y: pos.y }}
      transition={{ type: 'spring', stiffness: 260, damping: 18, mass: 0.4 }}
      style={{ willChange: 'transform' }}
    >
      {children}
    </motion.span>
  );
}
