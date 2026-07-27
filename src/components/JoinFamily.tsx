'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { AnimatedSection } from '@/components/AnimatedSection';
import { FamilyWall, type FamilyWallHandle } from '@/components/FamilyWall';

const TITLES = [
  'Grandma', 'Grandpa', 'Mumma', 'Papa', 'Sister', 'Brother', 'Auntie',
  'Uncle', 'Cousin', 'Nephew', 'Niece', 'Little', 'Big', 'Friend',
] as const;

export default function JoinFamily() {
  const wallRef = useRef<FamilyWallHandle>(null);
  const [title, setTitle] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return toast.error('Pick a title.');
    if (!name.trim()) return toast.error('Add your name.');
    if (!email.trim()) return toast.error('Add your email.');

    setSubmitting(true);
    try {
      const res = await fetch('/api/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, name, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Something went wrong.');
        return;
      }
      wallRef.current?.prependBrick({ title, name: data.brick.name });
      setName('');
      setEmail('');
      setTitle('');
      toast.success('Welcome to the family.');
    } catch {
      toast.error('Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="py-16 sm:py-20 bg-[#0A0A0A] relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 relative">
        <AnimatedSection animation="fadeIn">
          <div className="max-w-2xl mx-auto text-center mb-8 sm:mb-10">
            <p className="uppercase tracking-[0.25em] text-[#b88c41] text-xs sm:text-sm font-roboto-light mb-4">
              Join the Family
            </p>
            <h2 className="text-4xl sm:text-5xl font-editorial-ultralight text-[#e3dcd4] mb-4">
              Add your brick to the wall
            </h2>
            <p className="text-[#e3dcd4]/70 font-roboto-light">
              Everyone who walks through Grandma Jazz becomes part of the family.
              Leave your mark right here — no need to go anywhere else.
            </p>
          </div>
        </AnimatedSection>

        {/* The "window" box — same rounded-corner treatment as the photo
            boxes elsewhere on the page, except what's behind the glass is
            the live, actually-updating wall instead of a static image. */}
        <AnimatedSection animation="fadeIn" className="max-w-4xl mx-auto">
          <div className="relative w-full rounded-[15px] xl:rounded-[20px] overflow-hidden bg-[#0A0A0A] border border-[#b88c41]/15 min-h-[640px] sm:min-h-[600px] flex items-center justify-center p-5 sm:p-10">
            {/* Live wall, running behind the form as ambient texture */}
            <div
              className="absolute inset-0 flex items-center justify-center overflow-hidden p-8 sm:p-10 opacity-50"
              style={{ pointerEvents: 'none' }}
              aria-hidden="true"
            >
              <FamilyWall
                pollIntervalMs={15000}
                emptyMessage=""
                loadingMessage=""
                className="max-w-2xl"
              />
            </div>

            {/* Scrim so the form stays legible over the moving names */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A]/40 via-[#0A0A0A]/75 to-[#0A0A0A]/90 pointer-events-none" />
            <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full bg-[#b88c41]/10 blur-3xl" />

            {/* The actual join form, floating on top */}
            <form
              onSubmit={handleSubmit}
              className="relative z-10 w-full max-w-md bg-[#141414]/85 backdrop-blur-md border border-[#b88c41]/25 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/40"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <select
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-[#0A0A0A] border border-[#b88c41]/30 text-[#e3dcd4] rounded-full px-5 py-3 font-roboto-light focus:outline-none focus:border-[#b88c41] transition-colors"
                  aria-label="Select title"
                >
                  <option value="">Select title</option>
                  {TITLES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  maxLength={24}
                  className="bg-[#0A0A0A] border border-[#b88c41]/30 text-[#e3dcd4] rounded-full px-5 py-3 font-roboto-light placeholder:text-[#e3dcd4]/40 focus:outline-none focus:border-[#b88c41] transition-colors"
                  aria-label="Your name"
                />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                className="w-full mt-4 bg-[#0A0A0A] border border-[#b88c41]/30 text-[#e3dcd4] rounded-full px-5 py-3 font-roboto-light placeholder:text-[#e3dcd4]/40 focus:outline-none focus:border-[#b88c41] transition-colors"
                aria-label="Your email"
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-5 bg-[#b88c41] hover:bg-[#a67c34] text-[#0A0A0A] font-roboto uppercase tracking-wider rounded-full px-6 py-3 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Adding…' : 'Add to Wall'}
              </button>
              <p className="text-center text-[#e3dcd4]/40 text-xs mt-3 font-roboto-light">
                Your name joins the wall. Your email stays private — just for the family newsletter.
              </p>
            </form>
          </div>
        </AnimatedSection>

        <div className="text-center mt-6">
          <Link
            href="/family"
            className="inline-block text-[#b88c41] hover:text-[#e3dcd4] font-roboto-light text-sm uppercase tracking-widest transition-colors border-b border-[#b88c41]/40 hover:border-[#e3dcd4] pb-0.5"
          >
            View the full wall
          </Link>
        </div>
      </div>
    </div>
  );
}
