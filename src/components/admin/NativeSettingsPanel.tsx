'use client';
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import FamilyMembersPanel from './FamilyMembersPanel';
import { request, control } from './SettingsUI';
const EventsSettings=dynamic(()=>import('./EventsSettings'),{ssr:false,loading:()=> <p>Loading event controls…</p>});
const GarmentsSettings=dynamic(()=>import('./GarmentsSettings'),{ssr:false,loading:()=> <p>Loading edition controls…</p>});
export default function NativeSettingsPanel({section}:{section:'events'|'family'|'garments'}){
 const {token}=useAuth();const [connected,setConnected]=useState(section==='family');
const [error,setError]=useState('');
const [attempt,setAttempt]=useState(0);
 const headers=useMemo(()=>({Authorization:`Bearer ${token || ''}`}),[token]);
 // biome-ignore lint/correctness/useExhaustiveDependencies: attempt explicitly reconnects the admin session.
 useEffect(()=>{if(!token)return;let active=true;setError('');setConnected(section==='family');
   if(section==='family')return;
   const url=section==='events'?'/events/api/v1/auth/current-admin':'/garments/api/auth/current-admin';
   request(url,'POST',undefined,headers).then(()=>{if(active)setConnected(true);}).catch(error=>{if(active)setError(error.message);});
   return()=>{active=false;};
 },[token,section,headers,attempt]);
 return <div className="native-admin-settings">{error&&<div role="alert" className="rounded-control border border-red-400/40 p-4 mb-4">{error}<button type="button" className={`${control} ml-4`} onClick={()=>setAttempt(value=>value+1)}>Reconnect</button></div>}
 {!connected&&!error&&<p>Connecting your admin account…</p>}
 {connected&&(section==='family'?<FamilyMembersPanel headers={headers} canAccess={!!token}/>:section==='garments'?<GarmentsSettings/>:<EventsSettings/>)}
 </div>;
}
