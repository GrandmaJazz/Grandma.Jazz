'use client';

import { useState } from 'react';
import type { ImageProps } from 'next/image';
import manifest from '@/lib/responsive-images.json';

type Entry = { base: string; widths: number[]; width: number; height: number };
const images = manifest as Record<string, Entry>;
/** Static responsive files avoid the metered image optimizer. New CMS URLs safely use their original. */
export default function ResponsiveImage({ src, alt, fill, priority, sizes, width, height, style, onError,
  unoptimized: _unoptimized, loader: _loader, quality: _quality, placeholder: _placeholder,
  blurDataURL: _blurDataURL, onLoadingComplete: _onLoadingComplete, fetchPriority, ...props }: ImageProps) {
  const original = typeof src === 'string' ? src : 'default' in src ? src.default.src : src.src;
  const [failed, setFailed] = useState(false);
  const entry = failed ? undefined : images[original];
  const fallbackWidth = entry?.widths.find(value => value >= 640) ?? entry?.widths.at(-1);
  return <img {...props} alt={alt} src={entry ? `${entry.base}-${fallbackWidth}.webp` : original}
    srcSet={entry ? entry.widths.map(value => `${entry.base}-${value}.webp ${value}w`).join(', ') : undefined}
    sizes={sizes || (fill ? '100vw' : typeof width === 'number' ? `${width}px` : undefined)}
    width={fill ? undefined : width} height={fill ? undefined : height}
    loading={priority ? 'eager' : props.loading || 'lazy'} {...{ fetchpriority: priority ? 'high' : fetchPriority }}
    decoding="async" style={{ ...(fill ? { position: 'absolute', inset: 0, width: '100%', height: '100%' } : {}), ...style }}
    onError={event => { if (entry) setFailed(true); else onError?.(event); }} />;
}
