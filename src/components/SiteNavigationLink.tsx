"use client";

import Link from "next/link";
import type { AnchorHTMLAttributes } from "react";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

// Public sections share the persistent shell and its music player.
export function SiteNavigationLink({ href, ...props }: Props) {
  if (!href.startsWith("/") || href.startsWith("//")) {
    return <a href={href} {...props} />;
  }
  return <Link href={href} {...props} />;
}
