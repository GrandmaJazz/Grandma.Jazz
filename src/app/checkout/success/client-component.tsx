// src/app/checkout/success/client-component.tsx
'use client';

import { useSearchParams } from 'next/navigation';

export function ClientParams() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  
  // คืนค่า sessionId เพื่อให้ server component สามารถใช้ได้
  return (
    <div data-session-id={sessionId || ''}></div>
  );
}