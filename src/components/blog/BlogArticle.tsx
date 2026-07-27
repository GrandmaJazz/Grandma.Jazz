// src/components/blog/BlogArticle.tsx
'use client';

import { useEffect, useRef, useState, ReactNode } from 'react';

/* ---------------------------------------------------------------
   BlogArticle
   ---------------------------------------------------------------
   Fixes the "all the images sit at the bottom" problem.

   HOW IT WORKS (this is the bit that matters for Ac):
   In the blog CONTENT box, just type   [IMAGE 1]   on its own line
   wherever you want the first uploaded image to appear.
   [IMAGE 2] for the second, and so on.

   If you don't type any markers at all, the images are spread
   evenly through the article automatically. So it can never break.
--------------------------------------------------------------- */

export interface ResolvedImage {
  /** Full URL — already run through getFileUrl() on the server */
  src: string;
  caption?: string;
}

interface Props {
  content: string;
  images: ResolvedImage[];
}

type Block =
  | { kind: 'h2'; text: string }
  | { kind: 'h3'; text: string }
  | { kind: 'quote'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'p'; text: string }
  | { kind: 'image'; index: number }
  | { kind: 'video'; id: string };

/* ---------- 1. Turn the raw content string into blocks ---------- */

function parseContent(content: string): Block[] {
  const chunks = content.replace(/\r\n/g, '\n').split(/\n{2,}/);
  const blocks: Block[] = [];

  for (const raw of chunks) {
    const text = raw.trim();
    if (!text) continue;

    // Tolerate markers written as **[IMAGE 1 — description]** or *[IMAGE 1]*
    const bare = text.replace(/^\*+/, '').replace(/\*+$/, '').trim();

    const imageMarker = bare.match(/^\[\s*image\s*(\d+)[\s\S]*\]$/i);
    if (imageMarker) {
      blocks.push({ kind: 'image', index: parseInt(imageMarker[1], 10) - 1 });
      continue;
    }

    // Planning notes like [EMBED — pick the strongest performance] are skipped,
    // never printed. Paste the actual YouTube link on its own line instead.
    if (/^\[\s*(embed|note|todo)\b[\s\S]*\]$/i.test(bare)) continue;

    // A YouTube link on its own line becomes an inline player.
    const yt = bare.match(
      /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
    );
    if (yt) {
      blocks.push({ kind: 'video', id: yt[1] });
      continue;
    }

    if (/^###\s+/.test(text)) {
      blocks.push({ kind: 'h3', text: text.replace(/^###\s+/, '') });
      continue;
    }
    if (/^##\s+/.test(text)) {
      blocks.push({ kind: 'h2', text: text.replace(/^##\s+/, '') });
      continue;
    }
    if (/^>\s?/.test(text)) {
      blocks.push({
        kind: 'quote',
        text: text
          .split('\n')
          .map((l) => l.replace(/^>\s?/, ''))
          .join(' ')
          .trim(),
      });
      continue;
    }

    const lines = text.split('\n');
    if (lines.every((l) => /^\s*[-*•]\s+/.test(l))) {
      blocks.push({
        kind: 'list',
        items: lines.map((l) => l.replace(/^\s*[-*•]\s+/, '').trim()),
      });
      continue;
    }

    blocks.push({ kind: 'p', text });
  }

  return blocks;
}

/* ---------- 2. Place the images ---------- */

function placeImages(blocks: Block[], imageCount: number): Block[] {
  const used = new Set(
    blocks.filter((b): b is Extract<Block, { kind: 'image' }> => b.kind === 'image').map((b) => b.index),
  );

  // Markers were used — trust them, then append anything left over.
  if (used.size > 0) {
    const leftovers: Block[] = [];
    for (let i = 0; i < imageCount; i++) {
      if (!used.has(i)) leftovers.push({ kind: 'image', index: i });
    }
    return [...blocks, ...leftovers];
  }

  // No markers — spread them evenly so it still reads well.
  if (imageCount === 0) return blocks;

  const textBlocks = blocks.filter((b) => b.kind !== 'image');
  const out: Block[] = [];
  const step = Math.max(1, Math.floor(textBlocks.length / (imageCount + 1)));
  let placed = 0;

  textBlocks.forEach((block, i) => {
    out.push(block);
    if (placed < imageCount && i > 0 && (i + 1) % step === 0) {
      out.push({ kind: 'image', index: placed });
      placed++;
    }
  });

  while (placed < imageCount) {
    out.push({ kind: 'image', index: placed });
    placed++;
  }

  return out;
}

/* ---------- 3. Inline formatting: **bold**, *italic*, [links](url) ---------- */

function inline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let n = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyPrefix}-i${n++}`;

    if (token.startsWith('**')) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('[')) {
      const [, label, href] = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/) || [];
      const external = /^https?:\/\//.test(href || '');
      nodes.push(
        <a
          key={key}
          href={href}
          className="gj-link"
          {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {label}
        </a>,
      );
    } else {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    }
    last = match.index + token.length;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/* ---------- 4. Reveal-on-scroll wrapper ---------- */

function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Honour reduced-motion and older browsers: just show it.
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`gj-reveal${shown ? ' gj-reveal--in' : ''}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ---------- 5. The article ---------- */

export default function BlogArticle({ content, images }: Props) {
  const blocks = placeImages(parseContent(content || ''), images?.length ?? 0);
  let imageSeen = 0;

  return (
    <div className="gj-article">
      {blocks.map((block, i) => {
        const key = `b${i}`;

        if (block.kind === 'image') {
          const img = images?.[block.index];
          if (!img?.src) return null;
          const isFirst = imageSeen === 0;
          imageSeen++;

          return (
            <Reveal key={key}>
              <figure className="gj-figure">
                <div className="gj-figure__frame">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.src}
                    alt={img.caption || ''}
                    loading={isFirst ? 'eager' : 'lazy'}
                    decoding="async"
                    fetchPriority={isFirst ? 'high' : 'auto'}
                    className="gj-figure__img"
                  />
                </div>
                {img.caption ? <figcaption className="gj-figure__cap">{img.caption}</figcaption> : null}
              </figure>
            </Reveal>
          );
        }

        if (block.kind === 'video')
          return (
            <Reveal key={key}>
              <figure className="gj-figure">
                <div className="gj-figure__frame gj-figure__frame--video">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${block.id}`}
                    title="Sessions with Grandma"
                    loading="lazy"
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </figure>
            </Reveal>
          );

        if (block.kind === 'h2')
          return (
            <Reveal key={key}>
              <h2 className="gj-h2">{inline(block.text, key)}</h2>
            </Reveal>
          );

        if (block.kind === 'h3')
          return (
            <Reveal key={key}>
              <h3 className="gj-h3">{inline(block.text, key)}</h3>
            </Reveal>
          );

        if (block.kind === 'quote')
          return (
            <Reveal key={key}>
              <blockquote className="gj-quote">
                <p>{inline(block.text, key)}</p>
              </blockquote>
            </Reveal>
          );

        if (block.kind === 'list')
          return (
            <Reveal key={key}>
              <ul className="gj-list">
                {block.items.map((item, j) => (
                  <li key={`${key}-${j}`}>{inline(item, `${key}-${j}`)}</li>
                ))}
              </ul>
            </Reveal>
          );

        return (
          <Reveal key={key}>
            <p className="gj-p">{inline(block.text, key)}</p>
          </Reveal>
        );
      })}
    </div>
  );
}
