'use client';
import type { ReactNode, InputHTMLAttributes } from 'react';
export const control = 'rounded-control border border-[#B49B73]/40 bg-[#181818] px-4 py-2 text-sm text-[#F5F1E6] hover:border-[#B49B73] disabled:opacity-40';
export function Card({title,children}:{title:string;children:ReactNode}) { return <section className="rounded-control border border-[#B49B73]/25 bg-[#181818] p-5"><h2 className="mb-4 text-xl font-editorial-ultralight">{title}</h2>{children}</section>; }
export function Input({label,...props}:InputHTMLAttributes<HTMLInputElement>&{label:string}) { return <label className="block text-sm text-[#F5F1E6]/75">{label}<input {...props} className="mt-2 block w-full rounded-control border border-[#B49B73]/35 bg-[#111] px-3 py-2 text-[#F5F1E6]" /></label>; }
export async function request<T=unknown>(url:string, method='GET', json?:unknown, headers:Record<string,string>={}) : Promise<T> {
 const response=await fetch(url,{method,credentials:'same-origin',cache:'no-store',headers:{...headers,...(json===undefined?{}:{'Content-Type':'application/json'})},body:json===undefined?undefined:JSON.stringify(json)});
 const body=await response.json().catch(()=>null);
 if(!response.ok || body===null) throw new Error(body?.error || 'Could not load this section. Please retry.');
 return body;
}
