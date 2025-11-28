'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

export function Footer() {
  const [email, setEmail] = useState('');
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate submission
    setSubmitStatus('success');
    setTimeout(() => {
      setSubmitStatus('idle');
      setEmail('');
    }, 3000);
  };

  return (
    <footer className="w-full bg-telepathic-black text-white pt-12 pb-6">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row justify-between mb-12">
          <div className="mb-8 md:mb-0">
            <Link href="/">
              <Image
                src="https://ext.same-assets.com/3395213435/3203265564.svg"
                alt="Telepathic Instruments"
                width={140}
                height={35}
                className="mb-6"
              />
            </Link>
          </div>

          <div className="max-w-md">
            <h3 className="text-lg mb-4">Sign up for the latest updates.</h3>
            <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full py-3 px-4 bg-black border border-gray-700 focus:outline-none focus:border-telepathic-orange"
                  required
                />
                {submitStatus === 'success' && (
                  <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-telepathic-black">
                    You'll hear from us soon
                  </div>
                )}
                {submitStatus === 'error' && (
                  <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-telepathic-black text-red-500">
                    Something went wrong, please try again.
                  </div>
                )}
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-green-700 hover:bg-green-600 transition-colors text-white uppercase tracking-tight"
              >
                Submit
              </button>
            </form>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start border-t border-gray-800 pt-6">
          <div className="text-sm text-gray-400">
            © 2024 Telepathic Instruments
          </div>

          <div className="flex space-x-8 mt-4 md:mt-0">
            <div className="flex flex-col space-y-3">
              <Link href="/policies/refund-policy" className="text-sm hover:text-telepathic-orange transition-colors">
                Returns Policy
              </Link>
              <Link href="/policies/privacy-policy" className="text-sm hover:text-telepathic-orange transition-colors">
                Privacy Policy
              </Link>
              <Link href="/policies/terms-of-service" className="text-sm hover:text-telepathic-orange transition-colors">
                Terms of Service
              </Link>
              <Link href="/pages/warranty" className="text-sm hover:text-telepathic-orange transition-colors">
                Warranty
              </Link>
            </div>

            <div className="flex flex-col space-y-3">
              <Link href="https://www.instagram.com/telepathic.instruments/" className="text-sm hover:text-telepathic-orange transition-colors" target="_blank" rel="noopener noreferrer">
                Instagram
              </Link>
              <Link href="https://www.youtube.com/@telepathic.instruments" className="text-sm hover:text-telepathic-orange transition-colors" target="_blank" rel="noopener noreferrer">
                Youtube
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
