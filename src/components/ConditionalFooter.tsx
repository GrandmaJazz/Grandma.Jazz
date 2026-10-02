'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

const Contact = dynamic(() => import('@/components/Contact'));

const pagesWithContact = new Set(['/', '/events', '/family', '/products']);

export default function ConditionalFooter() {
  const pathname = (usePathname() || '/').replace(/\/+$/, '') || '/';
  if (pathname.startsWith('/admin') || pagesWithContact.has(pathname)) return null;
  return <Contact />;
}
