import type { ReactNode } from 'react';
export function ManageLayout({ children, title }: { children: ReactNode; title?: string; minRole?: string }) {
 return <section>{title && <h2 className="mb-5 text-2xl font-editorial-ultralight">{title}</h2>}{children}</section>;
}
