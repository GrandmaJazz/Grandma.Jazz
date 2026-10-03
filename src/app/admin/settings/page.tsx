'use client';

import { useState } from 'react';
import Link from 'next/link';
import NativeSettingsPanel from '@/components/admin/NativeSettingsPanel';
import '@/components/admin/native-settings.css';

type Section = 'events' | 'family' | 'garments' | 'website';

const sections: { id: Section; label: string; description: string }[] = [
  { id: 'events', label: 'Events', description: 'Create and edit events, manage guests, check-in, your team and event settings.' },
  { id: 'family', label: 'Family Wall', description: 'View new members and totals, remove or restore names, and email a member.' },
  { id: 'garments', label: 'Garments', description: 'Upload and edit editions, manage drafts, publish, archive and restore.' },
  { id: 'website', label: 'Website', description: 'Open the existing content and commerce settings.' },
];

const websiteLinks = [
  { href: '/admin/blogs', label: 'Journal' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/discounts', label: 'Discounts' },
  { href: '/admin/cards', label: 'Playlist' },
];

export default function AdminSettingsPage() {
  const [section, setSection] = useState<Section>('events');
  return (
    <div className="text-[#F5F1E6]">
      <h1 className="text-3xl font-editorial-ultralight">Settings</h1>
      <p className="mt-2 mb-6 text-sm text-[#F5F1E6]/65">Manage every section from the main Grandma Jazz admin.</p>
      <div role="tablist" aria-label="Settings sections" className="mb-6 flex flex-wrap gap-2">
        {sections.map(item => (
          <button key={item.id} id={`settings-tab-${item.id}`} role="tab" type="button"
            aria-selected={section === item.id} aria-controls="settings-panel"
            onClick={() => setSection(item.id)}
            className={`rounded-control border px-4 py-2 text-sm transition-colors ${section === item.id ? 'border-[#B49B73] bg-[#B49B73] text-[#0A0A0A]' : 'border-[#B49B73]/40 hover:bg-[#B49B73]/10'}`}>
            {item.label}
          </button>
        ))}
      </div>
      <div id="settings-panel" role="tabpanel" aria-labelledby={`settings-tab-${section}`}>
        <p className="mb-4 text-sm text-[#F5F1E6]/70">{sections.find(item => item.id === section)?.description}</p>
        {section === 'events' && <NativeSettingsPanel key="events" section="events" />}
        {section === 'family' && <NativeSettingsPanel key="family" section="family" />}
        {section === 'garments' && <NativeSettingsPanel key="garments" section="garments" />}
        {section === 'website' && <div className="grid gap-3 sm:grid-cols-2 max-w-2xl">
          {websiteLinks.map(item => <Link key={item.href} href={item.href}
            className="rounded-control border border-[#B49B73]/40 p-5 hover:border-[#B49B73] hover:bg-[#B49B73]/10">{item.label} →</Link>)}
        </div>}
      </div>
    </div>
  );
}
