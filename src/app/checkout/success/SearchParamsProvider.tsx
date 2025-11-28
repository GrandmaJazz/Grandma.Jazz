// src/app/checkout/success/SearchParamsProvider.tsx
'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';

// สร้าง context สำหรับ search params
const SearchParamsContext = createContext<{ sessionId: string | null }>({ sessionId: null });

// hook สำหรับใช้ context
export function useSessionId() {
  return useContext(SearchParamsContext);
}

// Provider component
export function SearchParamsProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  return (
    <SearchParamsContext.Provider value={{ sessionId }}>
      {children}
    </SearchParamsContext.Provider>
  );
}