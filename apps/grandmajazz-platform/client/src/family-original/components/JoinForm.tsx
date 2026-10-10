import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { TITLES, type FamilyMember } from '@/family-original/lib/mockData';
import { apiUrl } from '@/family-original/lib/api';
import { familyNicknameSchema } from '@shared/family-original/familyValidation';
import { BRICK_FRAME, BRICK_LAYOUT as L, BRAND_TITLE_PATHS, BRAND_NAME_PATHS, brickLetters, brickTextLine, brickTextScale } from '@shared/family-original/brickArtwork';
import { useId } from 'react';
import { z } from 'zod';
const emailSchema = z.string().trim().email('Please enter a valid email');
import { BRICK_TIMELINE as T, clearSession, readSession, writeSession } from './brick-experience/timeline';
import { useBrickPresentation } from './brick-experience/useBrickPresentation';
import { useTitleSelection } from './brick-experience/useTitleSelection';
import { useBrickSceneLayout } from './brick-experience/useBrickSceneLayout';
import { BrickButtonFrame } from './BrickButtonFrame';
import './brick-experience/brick-experience.css';

type Values = {title:string;name:string;email:string};
function readDraft():Values|null {
  try {const d=JSON.parse(readSession(T.draftKey)||'null');return d && (TITLES.includes(d.title) || d.title==='Friend' || d.title==='') && typeof d.name==='string' && typeof d.email==='string' ? {...d,title:d.titleChosen===true?(d.title==='Friend'?'Our':d.title):''} : null;}catch{return null;}
}
interface JoinFormProps {
  onJoin:(member:Omit<FamilyMember,'id'>)=>Promise<void>;
  onExistingMember:(member:FamilyMember)=>void;
  publicRecords:FamilyMember[];
  dataReady:boolean;
  loadFreshRecords:()=>Promise<FamilyMember[]>;
  onPresentationReadyChange:(ready:boolean)=>void;
}
export function JoinForm({onJoin,onExistingMember,publicRecords,dataReady,loadFreshRecords,onPresentationReadyChange}:JoinFormProps){
  const [draft]=useState(readDraft);
  const [values,setValues]=useState<Values>(draft||{title:'',name:'',email:''});
  const [emailStep,setEmailStep]=useState(!!draft?.title && !!draft?.email);
  const [pending,setPending]=useState(false);
  const [errors,setErrors]=useState<{name?:string;email?:string;root?:string}>({});
  const locked=useRef(false), composing=useRef(false);
  const root=useRef<HTMLDivElement>(null),host=useRef<HTMLDivElement>(null),nickname=useRef<HTMLInputElement>(null),email=useRef<HTMLInputElement>(null);
  const choices=useRef<HTMLDivElement>(null);
  const scene=useRef<HTMLDivElement>(null),bottom=useRef<HTMLDivElement>(null);
  const [scale,setScale]=useState(1);
  useBrickSceneLayout(scene,bottom);

  const {ready,sequence,replay}=useBrickPresentation(root,host,publicRecords,dataReady,!!draft,loadFreshRecords);
  useLayoutEffect(()=>onPresentationReadyChange(ready),[ready,onPresentationReadyChange]);
  const id=useId().replace(/:/g,'');const clip=`brick-interior-${id}`;
  useLayoutEffect(()=>{
    const element=host.current;if(!element)return;
    const measure=()=>setScale(element.clientWidth/L.width);measure();
    if(typeof ResizeObserver==='undefined'){window.addEventListener('resize',measure);return()=>window.removeEventListener('resize',measure);}
    const observer=new ResizeObserver(entries=>setScale(entries[0].contentRect.width/L.width));observer.observe(element);
    return()=>observer.disconnect();
  },[]);
  const update=(key:keyof Values,value:string)=>{
    setValues(old=>{const next={...old,[key]:value};writeSession(T.draftKey,JSON.stringify({...next,titleChosen:!!next.title}));return next;});
    setErrors(old=>({...old,[key]:undefined,root:undefined}));
  };
  const selection=useTitleSelection(host,choices,values.title,ready,update);
  async function submit(e:React.FormEvent){
    e.preventDefault();if(!ready||locked.current||composing.current||!values.title||selection.moving)return;
    const parsed=familyNicknameSchema.safeParse(values.name);
    if(!parsed.success){setErrors({name:parsed.error.issues[0].message});nickname.current?.focus();return;}
    if(!emailStep){setEmailStep(true);requestAnimationFrame(()=>email.current?.focus());return;}
    if(!emailSchema.safeParse(values.email).success){setErrors({email:'Please enter a valid email'});email.current?.focus();return;}
    locked.current=true;setPending(true);setErrors({});
    const payload={title:values.title,name:parsed.data,email:values.email.trim()};
    try{
      // Preserve existing email lookup and creation workflow; no animation values enter it.
      let existing:FamilyMember|undefined;
      try{const res=await fetch(apiUrl('/api/members/check-email'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:payload.email})});
        if(res.ok){const result=await res.json();if(result.exists)existing=result.member;}
      }catch{/* The existing API remains authoritative if lookup is unavailable. */}
      if(existing)onExistingMember(existing);else await onJoin(payload);
      clearSession(T.draftKey);
    }catch{setErrors({root:'We couldn’t add your brick. Please try again.'});}
    finally{locked.current=false;setPending(false);}
  }
  const clipRect=L.clip;
  // A CSS line box and the SVG share the bundled font's ascent/descent and baseline.
  const inputHeight=540;
  const baselineOffset=(inputHeight+L.fontSize*(L.ascent-L.descent))/2;
  const fit=values.name?brickTextScale(values.name):1;
  const inputStyle:CSSProperties={left:L.right-L.textWidth,top:L.nameBaseline-baselineOffset,width:L.textWidth,height:inputHeight};
  const inputTextStyle:CSSProperties={width:L.textWidth/fit, height:inputHeight, transform:`scaleX(${fit})`, fontSize:L.fontSize,letterSpacing:L.tracking,lineHeight:`${inputHeight}px`};
  const titleMarkup=values.title==='Grandma'?BRAND_TITLE_PATHS:`<g fill="#fff">${brickTextLine(values.title,L.titleBaseline)}</g>`;
  return <div ref={root} className="brick-experience" data-ready={ready} style={{'--wall-dim':T.finalDim} as CSSProperties} data-phase={ready?'READY':'PREPARE'} data-title-stage={selection.stage}>
    <div className="brick-wall-dim" aria-hidden="true" />
    {!ready&&<div className="brick-intro-veil" aria-hidden="true" />}
    <form onSubmit={submit} noValidate aria-labelledby={`heading-${id}`}>
      <div className="brick-copy brick-heading" inert={!ready}>
        <h1 id={`heading-${id}`} tabIndex={-1}>Add Your Brick</h1>
        <p>Choose your title.</p>
      </div>
      <div className="brick-title-scene" ref={scene}>
        <div ref={choices} className="brick-title-choices" role="group" aria-label="Choose your family title" inert={!ready}>
          {TITLES.map(title=><button key={title} type="button" data-title={title} aria-label={title} aria-pressed={values.title===title} disabled={!ready||!!values.title||selection.moving||pending} className="brick-title-choice" style={{visibility:values.title===title?'hidden':undefined}} onClick={event=>selection.choose(title,event.currentTarget,event.detail===0?()=>nickname.current?.focus({preventScroll:true}):undefined)}>
            <svg viewBox={`0 0 ${L.width} ${L.height}`} aria-hidden="true">
              <g dangerouslySetInnerHTML={{__html:BRICK_FRAME}}/>
              <g dangerouslySetInnerHTML={{__html:title==='Grandma'?BRAND_TITLE_PATHS:`<g fill="#fff">${brickTextLine(title,L.titleBaseline)}</g>`}}/>
            </svg>
          </button>)}
        </div>
      <div className="brick-host" ref={host} data-testid="persistent-brick" style={{visibility:ready&&!values.title?'hidden':undefined}}>
        <svg className="brick-art" viewBox={`0 0 ${L.width} ${L.height}`} aria-hidden="true">
          <g data-canonical-outline dangerouslySetInnerHTML={{__html:BRICK_FRAME}} />
          <defs><clipPath id={clip}><rect x={clipRect.x} y={clipRect.y} width={clipRect.width} height={clipRect.height} rx={clipRect.radius}/></clipPath></defs>
          <g clipPath={`url(#${clip})`} style={{visibility:ready?'hidden':undefined}}>
            <g data-reel-track className="brick-reel">
              {sequence.map((record,i)=><g key={i} transform={`translate(0 ${i*L.height})`} data-record={i}>
                {i===sequence.length-1?<><g dangerouslySetInnerHTML={{__html:BRAND_TITLE_PATHS}}/><g className="brick-terminal-name" dangerouslySetInnerHTML={{__html:BRAND_NAME_PATHS}}/></>:<g dangerouslySetInnerHTML={{__html:brickLetters(record.title,record.name)}}/>}
              </g>)}
            </g>
          </g>
          {ready&&<g data-editable-title dangerouslySetInnerHTML={{__html:titleMarkup}}/>}
        </svg>
        <div className="brick-control-map" style={{width:L.width,height:L.height,transform:`scale(${scale})`}} inert={!ready||selection.stage!=='editing'}>
          <div className="brick-nickname-box" style={inputStyle}>
            <input ref={nickname} aria-label="Your nickname" aria-describedby={`rules-${id}${errors.name?` name-error-${id}`:''}`} aria-invalid={!!errors.name} value={values.name} onChange={e=>update('name',e.target.value)} onCompositionStart={()=>{composing.current=true;}} onCompositionEnd={()=>{composing.current=false;}} disabled={!ready||pending||selection.stage!=='editing'} placeholder="Enter nickname" autoComplete="nickname" spellCheck={false} className="brick-nickname" style={inputTextStyle}/>
          </div>
        </div>
      </div>
      </div>
      <div ref={bottom} className="brick-copy brick-form-bottom" style={{visibility:ready&&values.title?undefined:'hidden'}} inert={!ready||selection.stage!=='editing'}>
        <button type="button" className="brick-change-title" disabled={pending||selection.moving} onClick={()=>{setEmailStep(false);setErrors({});selection.change();}}>Change title</button>
        <span id={`rules-${id}`} className="sr-only">One nickname or first name. No full names. 2–12 characters.</span>
        {errors.name&&<p className="brick-error" id={`name-error-${id}`} role="alert">{errors.name}</p>}
        {emailStep&&<div className="brick-email-step">
          <label htmlFor={`email-${id}`}>Email address</label>
          <p id={`email-help-${id}`}>For your welcome email and finding your existing brick.</p>
          <input ref={email} id={`email-${id}`} type="email" autoComplete="email" value={values.email} onChange={e=>update('email',e.target.value)} disabled={pending} aria-describedby={`email-help-${id}${errors.email?` email-error-${id}`:''}`} aria-invalid={!!errors.email}/>
          {errors.email&&<p id={`email-error-${id}`} className="brick-error" role="alert">{errors.email}</p>}
        </div>}
        {errors.root&&<p className="brick-error" role="alert">{errors.root}</p>}
        <button type="submit" data-testid="button-submit" className="brick-shape-button brick-submit" disabled={!ready||pending||selection.moving}><BrickButtonFrame/><span className="brick-button-label">{pending?'Adding…':'Add to wall'}</span></button>
        <span role="status" className="sr-only">{pending?'Adding your brick. Please wait.':''}</span>
      </div>
    </form>
    {ready&&<button type="button" className="brick-replay" data-replay-intro="true" aria-label="Replay animation" title="Replay animation" disabled={pending||selection.moving} onClick={()=>{if(!locked.current)replay();}}>
      <svg aria-hidden="true" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10a9 9 0 1 1 2.7 8.4M3 4v6h6"/></svg>
    </button>}
  </div>;
}
