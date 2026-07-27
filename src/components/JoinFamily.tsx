'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { AnimatedSection } from '@/components/AnimatedSection';

const TITLES = [
  'Grandma', 'Grandpa', 'Mumma', 'Papa', 'Sister', 'Brother', 'Auntie',
  'Uncle', 'Cousin', 'Nephew', 'Niece', 'Little', 'Big', 'Friend',
] as const;

interface Brick {
  title: string;
  name: string;
  createdAt?: string;
}

export default function JoinFamily() {
  const [bricks, setBricks] = useState<Brick[]>([]);
  const [title, setTitle] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/family', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => setBricks(data.bricks ?? []))
      .catch(() => {
        // preview strip stays empty; not fatal
      });
  }, []);

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
      setBricks((prev) => [{ title, name: data.brick.name }, ...prev]);
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
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[640px] h-[640px] rounded-full bg-[#b88c41]/10 blur-3xl" />

      <div className="container mx-auto px-4 relative">
        <AnimatedSection animation="fadeIn">
          <div className="max-w-2xl mx-auto text-center mb-10">
            <p className="uppercase tracking-[0.25em] text-[#b88c41] text-xs sm:text-sm font-roboto-light mb-4">
              Join the Family
            </p>
            <h2 className="text-4xl sm:text-5xl font-editorial-ultralight text-[#e3dcd4] mb-4">
              Add your brick to the wall
            </h2>
            <p className="text-[#e3dcd4]/70 font-roboto-light">
              Everyone who walks through Grandma Jazz becomes part of the family.
              Leave your mark here — and we&apos;ll keep you in the loop on live nights and quiz sessions.
            </p>
          </div>
        </AnimatedSection>

        <AnimatedSection animation="fadeIn">
          <form
            onSubmit={handleSubmit}
            className="max-w-2xl mx-auto bg-[#141414]/80 backdrop-blur-sm border border-[#b88c41]/25 rounded-3xl p-6 sm:p-8 mb-10 shadow-2xl shadow-[#b88c41]/10"
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
        </AnimatedSection>

        {bricks.length > 0 && (
          <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-3 mb-8">
            {bricks.slice(0, 12).map((b, i) => (
              <div
                key={`${b.title}-${b.name}-${i}`}
                className="bg-[#141414] border border-[#b88c41]/20 rounded-2xl px-4 py-2.5"
              >
                <div className="text-[#b88c41] text-[10px] uppercase tracking-widest font-roboto-light">
                  {b.title}
                </div>
                <div className="text-[#e3dcd4] font-roboto-light leading-tight text-sm">
                  {b.name}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-center">
          <Link
            href="/family"
            className="inline-block text-[#b88c41] hover:text-[#e3dcd4] font-roboto-light text-sm uppercase tracking-widest transition-colors border-b border-[#b88c41]/40 hover:border-[#e3dcd4] pb-0.5"
          >
            See the whole wall
          </Link>
        </div>
      </div>
    </div>
  );
}
