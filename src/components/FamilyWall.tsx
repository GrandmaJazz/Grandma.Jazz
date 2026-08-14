// src/components/FamilyWall.tsx
// The live, animating grid of name-bricks pulled from the family wall API.
// Shared between the standalone /family page and the homepage embed so both
// show the exact same live wall rather than two implementations drifting apart.
'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface Brick {
  title: string;
  name: string;
  createdAt?: string;
}

export interface FamilyWallHandle {
  /** Optimistically add a brick the instant this visitor's own submit succeeds. */
  prependBrick: (brick: Brick) => void;
}

interface FamilyWallProps {
  className?: string;
  emptyMessage?: string;
  loadingMessage?: string;
  /** Set to 0 to disable background polling. */
  pollIntervalMs?: number;
  limit?: number;
}

export const FamilyWall = forwardRef<FamilyWallHandle, FamilyWallProps>(function FamilyWall(
  {
    className = '',
    emptyMessage = 'Be the first to join the family.',
    loadingMessage = 'Loading the wall…',
    pollIntervalMs = 20000,
    limit,
  },
  ref
) {
  const [bricks, setBricks] = useState<Brick[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWall = useCallback(async () => {
    try {
      const res = await fetch('/api/family', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) setBricks(data.bricks ?? []);
    } catch {
      // wall stays as-is; not fatal
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWall();
    if (!pollIntervalMs) return;
    const id = setInterval(loadWall, pollIntervalMs);
    return () => clearInterval(id);
  }, [loadWall, pollIntervalMs]);

  useImperativeHandle(ref, () => ({
    prependBrick: (brick) => setBricks((prev) => [brick, ...prev]),
  }), []);

  if (loading) {
    return <p className={`text-center text-[#e3dcd4]/40 font-roboto-light ${className}`}>{loadingMessage}</p>;
  }

  if (bricks.length === 0) {
    return <p className={`text-center text-[#e3dcd4]/40 font-roboto-light ${className}`}>{emptyMessage}</p>;
  }

  const visible = limit ? bricks.slice(0, limit) : bricks;

  return (
    <div className={`flex flex-wrap justify-center gap-3 ${className}`}>
      <AnimatePresence>
        {visible.map((b, i) => (
          <motion.div
            key={`${b.title}-${b.name}-${i}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3, delay: Math.min(i * 0.01, 0.4) }}
            className="group bg-[#181818] border border-[#B49B73]/20 rounded-2xl px-4 py-3 hover:border-[#B49B73]/60 transition-colors"
          >
            <div className="text-[#B49B73] text-[10px] uppercase tracking-widest font-roboto-light">
              {b.title}
            </div>
            <div className="text-[#e3dcd4] font-roboto-light leading-tight">
              {b.name}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
});
