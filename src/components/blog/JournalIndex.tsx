"use client";
import { useEffect, useState } from "react";
import { JournalCard, type JournalCardPost } from "./JournalCard";
import { journalCategory, journalTopics } from "@/lib/journalDesign";
const KEY = "gj-journal-browse-v1";
export default function JournalIndex({ posts }: { posts: JournalCardPost[] }) {
  const [filter, setFilter] = useState("All stories");
  const [query, setQuery] = useState("");
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(KEY) || "null");
      if (saved) {
        setFilter(
          journalTopics.includes(saved.filter) ? saved.filter : "All stories",
        );
        setQuery(typeof saved.query === "string" ? saved.query : "");
        requestAnimationFrame(() =>
          requestAnimationFrame(() =>
            window.scrollTo(0, Math.max(0, Number(saved.y) || 0)),
          ),
        );
      }
    } catch {
      /* Browsing also works with storage disabled. */
    }
  }, []);
  const visible = posts.filter(
    (p) =>
      (filter === "All stories" || journalCategory(p) === filter) &&
      `${p.title} ${p.excerpt}`.toLowerCase().includes(query.toLowerCase()),
  );
  const remember = () => {
    try {
      sessionStorage.setItem(
        KEY,
        JSON.stringify({ filter, query, y: window.scrollY }),
      );
    } catch {}
  };
  return (
    <div className="wrap view">
      <section className="masthead">
        <svg
          className="hill-line"
          viewBox="0 0 1000 560"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M80 1100V360A320 320 0 0 1 400 40H1140"
            transform="rotate(45 400 360)"
          />
        </svg>
        <div>
          <div className="eyebrow">The Grandma Jazz Journal</div>
          <h1 className="gj-display-title">
            From up<span>the <span className="gj-title-accent">hill</span>.</span>
          </h1>
        </div>
        <div className="intro">
          <div>
            <p className="gj-section-copy">
              Café stories. Good music.
              <br />
              <strong className="gj-copy-highlight">Things we care about.</strong>
              <br />A little from our corner of Kamala.
            </p>
            <div className="note">Pull up a chair. Have a read.</div>
          </div>
        </div>
      </section>
      <section aria-label="Browse stories">
        <div className="tools">
          <div className="filters">
            {journalTopics.map((c) => (
              <button
                key={c}
                aria-pressed={filter === c}
                onClick={() => setFilter(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <input
            className="search"
            type="search"
            aria-label="Search stories"
            placeholder="Find a story…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="result" aria-live="polite">
          {visible.length} {visible.length === 1 ? "story" : "stories"} · Newest
          first
        </div>
        <div className="grid">
          {visible.map((post, i) => (
            <JournalCard
              key={post._id}
              post={post}
              index={i}
              className={i === 0 ? "lead" : i === 1 ? "side" : ""}
              onOpen={remember}
            />
          ))}
        </div>
        {!visible.length && (
          <p className="empty">No stories here yet. Try another topic.</p>
        )}
        <div className="moreend">
          {visible.length === posts.length
            ? `You’ve reached all ${posts.length} stories.`
            : `${visible.length} stories in this selection.`}{" "}
          Take your time, dear.
        </div>
      </section>
    </div>
  );
}
