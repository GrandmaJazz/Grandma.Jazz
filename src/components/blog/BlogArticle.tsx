// src/components/blog/BlogArticle.tsx
"use client";

import { useEffect, useRef, useState, ReactNode } from "react";
import { parseContent, placeImages, type Block } from "@/lib/blogContent";
import { BrandText } from "./BrandText";
import { SiteNavigationLink } from "@/components/SiteNavigationLink";

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
  layoutBlocks?: Block[];
}

/* ---------- 3. Inline formatting: **bold**, *italic*, [links](url) ---------- */

function inline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let n = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last)
      nodes.push(
        <BrandText
          key={`${keyPrefix}-plain-${last}`}
          text={text.slice(last, match.index)}
          linked
        />,
      );
    const token = match[0];
    const key = `${keyPrefix}-i${n++}`;

    if (token.startsWith("**")) {
      nodes.push(
        <strong key={key}>
          {<BrandText text={token.slice(2, -2)} linked />}
        </strong>,
      );
    } else if (token.startsWith("[")) {
      const [, label, href] = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/) || [];
      const external = /^https?:\/\//.test(href || "");
      nodes.push(
        <SiteNavigationLink
          key={key}
          href={
            /^(https?:\/\/|\/(?!\/)|mailto:|tel:)/i.test(href || "")
              ? href
              : "#"
          }
          className="gj-link"
          {...(external
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
        >
          {<BrandText text={label || ""} />}
        </SiteNavigationLink>,
      );
    } else {
      nodes.push(
        <em key={key}>{<BrandText text={token.slice(1, -1)} linked />}</em>,
      );
    }
    last = match.index + token.length;
  }

  if (last < text.length)
    nodes.push(
      <BrandText
        key={`${keyPrefix}-plain-${last}`}
        text={text.slice(last)}
        linked
      />,
    );
  return nodes;
}

/* ---------- 4. Reveal-on-scroll wrapper ---------- */

function Reveal({
  children,
  delay = 0,
}: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Honour reduced-motion and older browsers: just show it.
    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced || typeof IntersectionObserver === "undefined") {
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
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`gj-reveal${shown ? " gj-reveal--in" : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ---------- 5. The article ---------- */

export default function BlogArticle({ content, images, layoutBlocks }: Props) {
  const blocks =
    layoutBlocks ??
    placeImages(parseContent(content || ""), images?.length ?? 0);
  let imageSeen = 0;

  return (
    <div className="gj-article prose">
      {blocks.map((block, i) => {
        const key = `b${i}`;

        if (block.kind === "image") {
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
                    alt={img.caption || ""}
                    loading={isFirst ? "eager" : "lazy"}
                    decoding="async"
                    fetchPriority={isFirst ? "high" : "auto"}
                    className="gj-figure__img"
                  />
                </div>
                {img.caption ? (
                  <figcaption className="gj-figure__cap">
                    {img.caption}
                  </figcaption>
                ) : null}
              </figure>
            </Reveal>
          );
        }

        if (block.kind === "video")
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

        if (block.kind === "h2")
          return (
            <Reveal key={key}>
              <h2 className="gj-h2">{inline(block.text, key)}</h2>
            </Reveal>
          );

        if (block.kind === "h3")
          return (
            <Reveal key={key}>
              <h3 className="gj-h3">{inline(block.text, key)}</h3>
            </Reveal>
          );

        if (block.kind === "quote")
          return (
            <Reveal key={key}>
              <blockquote className="gj-quote">
                <p>{inline(block.text, key)}</p>
              </blockquote>
            </Reveal>
          );

        if (block.kind === "list")
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
