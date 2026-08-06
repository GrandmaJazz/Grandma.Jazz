'use client';

import { Suspense } from 'react';
import ProfileContent from './ProfileContent';

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen pt-28 pb-16 bg-[#181818] flex justify-center items-center">
        <div className="w-12 h-12 border-4 border-[#B49B73] border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}