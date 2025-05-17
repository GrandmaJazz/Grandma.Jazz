'use client';

import { useSearchParams } from 'next/navigation';
import { ReactNode } from 'react';

type SessionIdProviderProps = {
  children: (sessionId: string | null) => ReactNode;
};

export function SessionIdProvider({ children }: SessionIdProviderProps) {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  
  return <>{children(sessionId)}</>;
}