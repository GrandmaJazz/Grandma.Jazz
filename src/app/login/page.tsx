'use client';

import { useEffect } from 'react';
import { useUI } from '@/contexts/UIContext';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { openLoginModal } = useUI();
  const { isAuthenticated, isAuthLoading } = useAuth();
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) openLoginModal('/');
    // Open once after the initial auth check; reopening the modal must be a
    // deliberate action if someone dismisses it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthLoading, isAuthenticated]);
  return (
    <section className="min-h-screen bg-[#181818] px-6 pt-32 text-center text-[#e3dcd4]">
      <h1 className="font-editorial-ultralight text-4xl">Sign in to Grandma Jazz</h1>
      <p className="mt-4">If you came from an unfinished form, keep that tab open and return to it after signing in.</p>
      <button type="button" onClick={() => openLoginModal('/')} className="mt-6 rounded-control border border-[#B49B73] px-6 py-3 text-[#B49B73]">Sign in</button>
    </section>
  );
}
