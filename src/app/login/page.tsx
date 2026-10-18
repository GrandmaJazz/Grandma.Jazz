'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUI } from '@/contexts/UIContext';
import { useAuth } from '@/contexts/AuthContext';
import { profileReturnPath, shopReturnPath } from '@/lib/shopNavigation';

function LoginContent() {
  const { openLoginModal } = useUI();
  const { isAuthenticated, isAuthLoading, user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const returnPath = shopReturnPath(searchParams?.get('redirect'));
  useEffect(() => {
    if (isAuthLoading) return;
    if (isAuthenticated) router.replace(user?.profileComplete ? returnPath : profileReturnPath(returnPath));
    else openLoginModal(returnPath);
    // Open once after the initial auth check; reopening the modal must be a
    // deliberate action if someone dismisses it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthLoading, isAuthenticated, returnPath]);
  return (
    <section className="min-h-screen bg-[#181818] px-6 pt-32 text-center text-[#e3dcd4]">
      <h1 className="font-editorial-ultralight text-4xl">Sign in to Grandma Jazz</h1>
      <p className="mt-4">Sign in to continue where you left off. Your shopping bag stays with you.</p>
      <button type="button" onClick={() => openLoginModal(returnPath)} className="gj-cta mt-6">Sign in</button>
    </section>
  );
}

export default function LoginPage() {
  return <Suspense><LoginContent /></Suspense>;
}
