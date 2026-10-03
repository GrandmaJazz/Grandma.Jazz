'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type Section = 'family' | 'events' | 'garments';

const panels: Record<Section, { title: string; url: string; session?: string }> = {
  family: { title: 'Family Wall', url: '/family-admin' },
  events: { title: 'Events', url: '/events/manage', session: '/events/api/v1/auth/current-admin' },
  garments: { title: 'Garments', url: '/garments/manage', session: '/garments/api/auth/current-admin' },
};

export default function AdminPlatformFrame({ section, path }: { section: Section; path?: string }) {
  const { token } = useAuth();
  const panel = panels[section];
  const [ready, setReady] = useState(section === 'family');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !panel.session) return;
    const controller = new AbortController();
    setReady(false);
    setError('');
    fetch(panel.session, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    }).then(response => {
      if (!response.ok) throw new Error(response.status === 403
        ? 'Your account does not have admin access to this section.'
        : 'Could not open this admin section. Please try again.');
      setReady(true);
    }).catch(err => {
      if (!controller.signal.aborted) setError(err.message);
    });
    return () => controller.abort();
  }, [token, panel.session]);

  return (
    <section className="w-full">
      <h1 className="mb-5 text-3xl font-editorial-ultralight text-[#F5F1E6]">{panel.title}</h1>
      {error && <div role="alert" className="mb-4 rounded-control border border-red-400/50 p-4 text-[#F5F1E6]">{error}</div>}
      {!ready && !error && <p className="text-[#F5F1E6]/70">Opening {panel.title}…</p>}
      {ready && <iframe
        title={`${panel.title} administration`}
        src={path || panel.url}
        className="w-full min-h-[850px] border border-[#7c4d33]/30 bg-black"
        style={{ height: 'calc(100vh - 150px)' }}
      />}
    </section>
  );
}
