"use client";

import Link from "next/link";
import type { AnchorHTMLAttributes } from "react";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

// Platform pages load their independent bundle; ordinary site links retain
// Next navigation so cart, authentication and the music player stay mounted.
export function SiteNavigationLink({ href, ...props }: Props) {
  if (href.startsWith("/garments") || !href.startsWith("/")) {
    return <a href={href} {...props} />;
  }
  return <Link href={href} {...props} />;
}
