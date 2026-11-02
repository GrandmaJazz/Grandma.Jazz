"use client";
import Link from "next/link";
export function JournalReturn() {
  return (
    <Link href="/blogs/" scroll={false} className="back">
      ← Back to the journal
    </Link>
  );
}
