'use client';

import { useEffect } from 'react';

// There was NO error boundary anywhere in the app. Any runtime throw — including
// a SecurityError from localStorage in a locked-down Safari window — unmounted
// the whole React tree and left a black screen with no way out but a refresh.
// This gives that failure a face, and a button.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Page error:', error);
  }, [error]);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 bg-[#0A0A0A] px-6 text-center text-[#F5F1E6]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/Grandma-Jazz-Logo-Heavier.webp"
        alt="Grandma Jazz"
        width={200}
        height={65}
        className="opacity-40 grayscale"
      />
      <p className="max-w-sm text-sm leading-relaxed opacity-85">
        Something went wrong on our side, dear. Give it another go.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full border border-[#F5F1E6]/50 px-6 py-2 text-sm transition-all duration-200 ease-out hover:-translate-y-px hover:bg-[#F5F1E6]/10 active:scale-[0.97]"
        >
          Try again
        </button>
        <a
          href="/"
          className="rounded-full border border-[#F5F1E6]/20 px-6 py-2 text-sm transition-all duration-200 ease-out hover:-translate-y-px hover:bg-[#F5F1E6]/10 active:scale-[0.97]"
        >
          Home
        </a>
      </div>
    </div>
  );
}
