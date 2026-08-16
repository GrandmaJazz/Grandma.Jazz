'use client';

import { Suspense } from 'react';
import LogoLoadingSpinner from '@/components/LogoLoadingSpinner';
import ProfileContent from './ProfileContent';

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen pt-28 pb-16 bg-[#181818] flex justify-center items-center">
        <LogoLoadingSpinner width={160} />
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}