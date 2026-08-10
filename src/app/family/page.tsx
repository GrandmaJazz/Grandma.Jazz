// src/app/family/page.tsx
'use client';

import { useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import Contact from '@/components/Contact';
import { AnimatedSection } from '@/components/AnimatedSection';
import { FamilyWall, type FamilyWallHandle } from '@/components/FamilyWall';

const TITLES = [
  'Grandma', 'Grandpa', 'Mumma', 'Papa', 'Sister', 'Brother', 'Auntie',
  'Uncle', 'Cousin', 'Nephew', 'Niece', 'Little', 'Big', 'Friend',
] as const;

export default function FamilyPage() {
  const wallRef = useRef<FamilyWallHandle>(null);
  const [title, setTitle] = useState<string>('');
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
      // Optimistically prepend the new brick.
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
    <>
      <div className="min-h-screen pt-28 pb-16 bg-[#0A0A0A] relative overflow-hidden">
        {/* ambient glow */}
        <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[640px] h-[640px] rounded-full bg-[#B49B73]/10 blur-3xl" />

        <div className="container mx-auto px-4 relative">
          <AnimatedSection animation="fadeIn">
            <div className="max-w-2xl mx-auto text-center mb-10">
              <p className="uppercase tracking-[0.25em] text-[#B49B73] text-xs sm:text-sm font-roboto-light mb-4">
                Join the Family
              </p>
              <h1 className="text-4xl sm:text-5xl font-editorial-ultralight text-[#e3dcd4] mb-4">
                Add your brick to the wall
              </h1>
              <p className="text-[#e3dcd4]/70 font-roboto-light">
                Everyone who walks through Grandma Jazz becomes part of the family.
                Leave your mark — and we&apos;ll keep you in the loop on live nights and quiz sessions.
              </p>
            </div>
          </AnimatedSection>

          {/* Form */}
          <AnimatedSection animation="fadeIn">
            <form
              onSubmit={handleSubmit}
              className="max-w-2xl mx-auto bg-[#141414]/80 backdrop-blur-sm border border-[#B49B73]/25 rounded-3xl p-6 sm:p-8 mb-14 shadow-2xl shadow-[#B49B73]/10"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <select
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-[#0A0A0A] border border-[#B49B73]/30 text-[#e3dcd4] rounded-full px-5 py-3 font-roboto-light focus:outline-none focus:border-[#B49B73] transition-colors"
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
                  className="bg-[#0A0A0A] border border-[#B49B73]/30 text-[#e3dcd4] rounded-full px-5 py-3 font-roboto-light placeholder:text-[#e3dcd4]/40 focus:outline-none focus:border-[#B49B73] transition-colors"
                  aria-label="Your name"
                />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                className="w-full mt-4 bg-[#0A0A0A] border border-[#B49B73]/30 text-[#e3dcd4] rounded-full px-5 py-3 font-roboto-light placeholder:text-[#e3dcd4]/40 focus:outline-none focus:border-[#B49B73] transition-colors"
                aria-label="Your email"
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-5 bg-[#B49B73] hover:bg-[#A98D60] text-[#0A0A0A] font-roboto uppercase tracking-wider rounded-full px-6 py-3 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Adding…' : 'Add to Wall'}
              </button>
              <p className="text-center text-[#e3dcd4]/40 text-xs mt-3 font-roboto-light">
                Your name joins the wall. Your email stays private — just for the family newsletter.
              </p>
            </form>
          </AnimatedSection>

          {/* Wall */}
          <div className="max-w-5xl mx-auto">
            <FamilyWall ref={wallRef} />
          </div>
        </div>
      </div>
      <Contact />
    </>
  );
}
