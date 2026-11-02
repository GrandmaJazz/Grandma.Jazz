"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { BrandText } from "./BrandText";
import { journalDesign, journalCategory } from "@/lib/journalDesign";
export interface JournalCardPost {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  images: { path: string; caption: string }[];
  tags: string[];
  minutes: number;
}
export function JournalCard({
  post,
  index,
  className = "",
  onOpen,
}: {
  post: JournalCardPost;
  index: number;
  className?: string;
  onOpen?: () => void;
}) {
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const heading = title.current;
    if (!heading) return;
    let active = true;
    let width = -1;
    const fit = () => {
      if (!active) return;
      heading.style.fontSize = "";
      for (
        let i = 0;
        i < 3 && heading.scrollWidth > heading.clientWidth + 1;
        i++
      ) {
        heading.style.fontSize = `${((parseFloat(getComputedStyle(heading).fontSize) * heading.clientWidth) / heading.scrollWidth) * 0.98}px`;
      }
    };
    const observer = new ResizeObserver(() => {
      if (heading.clientWidth !== width) {
        width = heading.clientWidth;
        fit();
      }
    });
    observer.observe(heading);
    fit();
    document.fonts.ready.then(fit);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, []);
  const words = post.title.split(" ");
  const tail = words.splice(-2).join(" ");
  const parts = journalDesign[post.slug]?.parts || [
    { text: words.join(" ") + " " },
    { text: tail, accent: true, bold: true },
  ];
  return (
    <Link
      href={`/blogs/${post.slug}/`}
      className={`cover ${className}`}
      onClick={onOpen}
      aria-label={`Read ${post.title}`}
    >
      {post.images[0] && (
        <img
          className="cover-photo"
          src={post.images[0].path}
          alt={post.images[0].caption || post.title}
          loading={index < 2 ? "eager" : "lazy"}
        />
      )}
      <div className="topline">
        <span>
          {String(index + 1).padStart(2, "0")} / {journalCategory(post)}
        </span>
        <span>{post.minutes} MIN</span>
      </div>
      <div className="covertext">
        <h2 ref={title}>
          {parts.map((p, i) =>
            p.bold ? (
              <b key={i}>
                <BrandText text={p.text} />
              </b>
            ) : p.accent ? (
              <span key={i}>
                <BrandText text={p.text} />
              </span>
            ) : (
              <BrandText key={i} text={p.text} />
            ),
          )}
        </h2>
        <p className="summary">
          <BrandText text={post.excerpt} />
        </p>
        <div className="read">
          <span>Read the story</span>
          <span className="arrow" aria-hidden="true">
            ↗
          </span>
        </div>
      </div>
    </Link>
  );
}
