//src/app/checkout/success/SessionIdProvider.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';

type SessionIdProviderProps = {
  children: (sessionId: string | null) => ReactNode;
};

export function SessionIdProvider({ children }: SessionIdProviderProps) {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  
  return <>{children(sessionId)}</>;
}