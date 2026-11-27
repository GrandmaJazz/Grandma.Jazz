'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { isEventAnnouncementPath } from '@/lib/eventAnnouncements';

const Contact = dynamic(() => import('@/components/Contact'));

const pagesWithContact = new Set(['/', '/events', '/family', '/products']);

export default function ConditionalFooter() {
  const pathname = (usePathname() || '/').replace(/\/+$/, '') || '/';
  if (pathname.startsWith('/admin') || pathname.startsWith('/garments') || (pathname.startsWith('/events/') && !isEventAnnouncementPath(pathname)) || pagesWithContact.has(pathname)) return null;
  return <Contact />;
}
