'use client';
import { useCallback, useEffect, useState } from 'react';
import { Card, control } from './SettingsUI';
import type { Edition, EditionState } from './garments/types';
import EditionEditor from './garments/EditionEditor';
import { api } from './garments/managementApi';

export default function GarmentsSettings(){
 const [status,setStatus]=useState<EditionState>('published');
 const [editions,setEditions]=useState<Edition[]>([]);
 const [selected,setSelected]=useState<Edition|null>(null);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const load=useCallback(async()=>{setError('');try{await api('auth/session');setEditions(await api<Edition[]>(`manage/editions?status=${status}`));}catch(e){setError((e as Error).message);}},[status]);
 useEffect(()=>{void load();},[load]);
 async function run(fn:()=>Promise<void>){if(busy)return;setBusy(true);setError('');try{await fn();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <div className="space-y-5 native-garments">{error&&<p role="alert" className="text-red-300">{error}</p>}
 {selected?<Card title="Edit edition"><EditionEditor key={selected.id} initial={selected} onClose={()=>{setSelected(null);void load();}} onExpired={()=>setError('Your session expired. Refresh the page to reconnect.')} /></Card>:<Card title="Garments editions">
 <p className="mb-5 text-sm text-[#F5F1E6]/65">Upload artwork or PDFs, arrange pages, edit details and publish an edition.</p>
 <div className="mb-5 flex flex-wrap gap-2">{(['draft','published','archived','trash'] as const).map(value=><button key={value} type="button" className={control} aria-pressed={status===value} disabled={busy} onClick={()=>setStatus(value)}>{({draft:'Drafts',published:'Published',archived:'Archived',trash:'Trash'})[value]}</button>)}<button className={control} disabled={busy} onClick={()=>void run(async()=>setSelected(await api<Edition>('manage/editions','POST',{})))}>New edition / upload</button></div>
 {!editions.length&&<p>No editions in this view.</p>}
 <div className="divide-y divide-[#B49B73]/20">{editions.map(edition=><article key={edition.id} className="flex flex-wrap items-center gap-4 py-4">{edition.document.cover.image&&<img alt="" src={edition.document.cover.thumbnail||edition.document.cover.image} className="h-20 w-14 object-cover" />}<div className="flex-1"><h3>{edition.document.title||'Untitled edition'}</h3><p className="text-sm text-[#F5F1E6]/60">{edition.document.issueNumber} · {edition.status}{edition.hasChanges?' · Unpublished changes':''}</p></div><div className="flex gap-2 flex-wrap">
 {status!=='trash'&&<button className={control} disabled={busy} onClick={()=>void run(async()=>setSelected(await api<Edition>(`manage/editions/${edition.id}`)))}>Edit / upload pages</button>}
 {(status==='published'?['archive','unpublish','trash']:status==='trash'?['restore']:status==='archived'?['restore','trash']:['trash']).map(action=><button key={action} className={control} disabled={busy} onClick={()=>void run(async()=>{if(action==='trash'&&!window.confirm('Move this edition to Trash? It can be restored.'))return;await api(`manage/editions/${edition.id}/action`,'POST',{action,version:edition.version});await load();})}>{action.charAt(0).toUpperCase()+action.slice(1)}</button>)}
 </div></article>)}</div></Card>}
 </div>;
}
