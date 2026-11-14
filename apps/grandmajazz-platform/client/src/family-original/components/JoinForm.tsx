import { FAMILY_MARKETING_COPY, FAMILY_MARKETING_VERSION, type FamilyMarketingChoice } from "@shared/family-original/marketingChoice";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { TITLES, type FamilyMember } from '@/family-original/lib/mockData';
import { apiUrl } from '@/family-original/lib/api';
import { familyNicknameSchema } from '@shared/family-original/familyValidation';
import { BRICK_FRAME, BRICK_LAYOUT as L, BRAND_TITLE_PATHS, brickTextLine, brickTextScale } from '@shared/family-original/brickArtwork';
import { useId } from 'react';
import { z } from 'zod';
const emailSchema = z.string().trim().email('Please enter a valid email');
import { BRICK_TIMELINE as T, clearSession, readSession, writeSession } from './brick-experience/timeline';
import { useTitleSelection } from './brick-experience/useTitleSelection';
import { useBrickSceneLayout } from './brick-experience/useBrickSceneLayout';
import './brick-experience/brick-experience.css';

type Values = {title:string;name:string;email:string};
function readDraft():Values|null {
  try {const d=JSON.parse(readSession(T.draftKey)||'null');return d && (TITLES.includes(d.title) || d.title==='Friend' || d.title==='') && typeof d.name==='string' && typeof d.email==='string' ? {...d,title:d.titleChosen===true?(d.title==='Friend'?'Our':d.title):''} : null;}catch{return null;}
}
interface JoinFormProps {
  onJoin:(member:Omit<FamilyMember,'id'> & FamilyMarketingChoice)=>Promise<void>;
  onExistingMember:(member:FamilyMember)=>void;
  onWallOnly:()=>void;
  onSubmitStart:()=>void;
  onSubmitError:()=>void;
  leaving:boolean;
}
export function JoinForm({onJoin,onExistingMember,onWallOnly,onSubmitStart,onSubmitError,leaving}:JoinFormProps){
  const [draft]=useState(readDraft);
  const [values,setValues]=useState<Values>(draft||{title:'',name:'',email:''});
  const [emailStep,setEmailStep]=useState(!!draft?.title && !!draft?.email);
  const [submitting,setSubmitting]=useState(false);
  // Membership never implies marketing permission; each visitor chooses separately.
  const [marketingConsent,setMarketingConsent]=useState(false);
  const pending=submitting||leaving;
  const [errors,setErrors]=useState<{name?:string;email?:string;root?:string}>({});
  const locked=useRef(false), composing=useRef(false);
  const titleTap=useRef<{id:number;x:number;y:number;title:string}|null>(null);
  const consumedTitleClick=useRef<string|null>(null);
  const root=useRef<HTMLDivElement>(null),host=useRef<HTMLDivElement>(null),nickname=useRef<HTMLInputElement>(null),email=useRef<HTMLInputElement>(null);
  const choices=useRef<HTMLDivElement>(null);
  const scene=useRef<HTMLDivElement>(null),bottom=useRef<HTMLDivElement>(null);
  const [scale,setScale]=useState(1);
  useBrickSceneLayout(scene,bottom);

  // Start with the choices. The name reel now celebrates a completed join.
  const ready=true;
  const id=useId().replace(/:/g,'');
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
  const returnToTitles=()=>{
    if(!ready||pending||selection.moving||selection.stage!=='editing')return;
    setEmailStep(false);setErrors({});selection.change();
  };
  const backToName=()=>{
    if(pending||selection.moving)return;
    setEmailStep(false);setErrors({});
    requestAnimationFrame(()=>nickname.current?.focus({preventScroll:true}));
  };
  const goBack=()=>{if(emailStep)backToName();else returnToTitles();};
  async function submit(e:React.FormEvent){
    e.preventDefault();if(!ready||locked.current||composing.current||!values.title||selection.moving)return;
    const parsed=familyNicknameSchema.safeParse(values.name);
    if(!parsed.success){setErrors({name:parsed.error.issues[0].message});nickname.current?.focus({preventScroll:true});return;}
    if(!emailStep){setEmailStep(true);requestAnimationFrame(()=>email.current?.focus({preventScroll:true}));return;}
    if(!emailSchema.safeParse(values.email).success){setErrors({email:'Please enter a valid email'});email.current?.focus({preventScroll:true});return;}
    // Hold the current composition before disabling inputs closes the keyboard.
    onSubmitStart();
    if(document.activeElement instanceof HTMLInputElement)document.activeElement.blur();
    locked.current=true;setSubmitting(true);setErrors({});
    const payload:Omit<FamilyMember,'id'> & FamilyMarketingChoice={title:values.title,name:parsed.data,email:values.email.trim(),marketingConsent,marketingConsentVersion:FAMILY_MARKETING_VERSION};
    try{
      // Preserve existing email lookup and creation workflow; no animation values enter it.
      let existing:FamilyMember|undefined;
      try{const res=await fetch(apiUrl('/api/members/check-email'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:payload.email})});
        if(res.ok){const result=await res.json();if(result.exists)existing=result.member;}
      }catch{/* The existing API remains authoritative if lookup is unavailable. */}
      if(existing)onExistingMember(existing);else await onJoin(payload);
      clearSession(T.draftKey);
    }catch{onSubmitError();setErrors({root:'We couldn’t add your brick. Please try again.'});}
    finally{locked.current=false;setSubmitting(false);}
  }
  // A CSS line box and the SVG share the bundled font's ascent/descent and baseline.
  const inputHeight=540*scale;
  const fit=values.name?brickTextScale(values.name):1;
  const fontSize=Math.max(16,L.fontSize*scale*fit);
  const baselineOffset=(inputHeight+fontSize*(L.ascent-L.descent))/2;
  const inputStyle:CSSProperties={left:(L.right-L.textWidth)*scale,top:L.nameBaseline*scale-baselineOffset,width:L.textWidth*scale,height:inputHeight};
  const inputTextStyle:CSSProperties={width:'100%',height:inputHeight,fontSize,letterSpacing:L.tracking*scale*fit,lineHeight:`${inputHeight}px`};
  const titleMarkup=values.title==='Grandma'?BRAND_TITLE_PATHS:`<g fill="#fff">${brickTextLine(values.title,L.titleBaseline)}</g>`;
  return <div ref={root} className="brick-experience" data-ready={ready} style={{'--wall-dim':T.finalDim} as CSSProperties} data-phase={ready?'READY':'PREPARE'} data-title-stage={selection.stage} data-email-step={emailStep}>
    <div className="brick-wall-dim" aria-hidden="true" />
    <div className="brick-focus-shade" aria-hidden="true" />
    <form onSubmit={submit} noValidate aria-labelledby={`heading-${id}`} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();goBack();}}}>
      <div className="brick-copy brick-heading" inert={!ready}>
        <ol className="family-steps" aria-label="Your brick in three steps">
          {['Title','Name','Email'].map((label,index)=><li key={label} aria-current={index===(!values.title?0:emailStep?2:1)?'step':undefined}><span aria-hidden="true">0{index+1}</span> {label}</li>)}
        </ol>
        <h1 id={`heading-${id}`} tabIndex={-1}>{!values.title?<>Join the <span>family.</span></>:emailStep?<>One last <span>step.</span></>:<>Make it <span>yours.</span></>}</h1>
        <p>{!values.title?'Choose a title that feels like you. Then add your name and email.':emailStep?'Keep your brick, and a little Grandma, close. Add your email below.':'Add the name your family knows you by. Your brick updates as you type.'}</p>
      </div>
      <div className="brick-title-scene" ref={scene}>
        <div ref={choices} className="brick-title-choices" role="group" aria-label="Choose your family title" aria-hidden={selection.stage!=='choosing'||undefined} inert={!ready||selection.stage!=='choosing'}>
          {TITLES.map(title=><button key={title} type="button" data-title={title} aria-label={values.title?`Back to titles — ${title}`:title} aria-pressed={values.title===title} disabled={!ready||selection.moving||pending} className="gj-cta brick-title-choice" style={{visibility:values.title===title?'hidden':undefined} as CSSProperties}
          onPointerDown={event=>{
            consumedTitleClick.current=null;
            titleTap.current=event.isPrimary&&event.pointerType!=='mouse'?{id:event.pointerId,x:event.clientX,y:event.clientY,title}:null;
          }} onPointerMove={event=>{
            const tap=titleTap.current;
            if(tap?.id===event.pointerId&&Math.hypot(event.clientX-tap.x,event.clientY-tap.y)>12){
              consumedTitleClick.current=tap.title;titleTap.current=null;
            }
          }} onPointerCancel={()=>{titleTap.current=null;}} onPointerUp={event=>{
            const tap=titleTap.current;titleTap.current=null;
            if(!tap||tap.id!==event.pointerId||tap.title!==title)return;
            // Activate touch selections on release without replaying the compatibility click.
            // Activate on touch release, then consume the compatibility click so it
            // cannot immediately send the newly selected brick back to the grid.
            event.preventDefault();consumedTitleClick.current=title;
            if(values.title)returnToTitles();else selection.choose(title,event.currentTarget);
          }} onClick={event=>{
            if(event.detail!==0&&consumedTitleClick.current===title){
              consumedTitleClick.current=null;event.preventDefault();event.stopPropagation();return;
            }
            consumedTitleClick.current=null;
            if(values.title)returnToTitles();
            else selection.choose(title,event.currentTarget,event.detail===0?()=>nickname.current?.focus({preventScroll:true}):undefined);
          }}>
            {title}
          </button>)}
        </div>
      <div className="brick-host" ref={host} data-testid="persistent-brick" style={{visibility:ready&&!values.title?'hidden':undefined}}>
        <svg className="brick-art" viewBox={`0 0 ${L.width} ${L.height}`} aria-hidden="true">
          <g data-canonical-outline dangerouslySetInnerHTML={{__html:BRICK_FRAME}} />
          {ready&&<g data-editable-title dangerouslySetInnerHTML={{__html:titleMarkup}}/>}
        </svg>
        {ready&&values.title&&<button type="button" className="brick-return-surface" aria-label="Edit your nickname" disabled={pending||selection.stage!=='editing'} onClick={backToName}/>}
        <div className="brick-control-map" style={{width:'100%',height:'100%'}} inert={!ready||selection.stage!=='editing'}>
          <div className="brick-nickname-box" style={inputStyle}>
            <input ref={nickname} aria-label="Your nickname" aria-describedby={`rules-${id}${errors.name?` name-error-${id}`:''}`} aria-invalid={!!errors.name} value={values.name} onChange={e=>update('name',e.target.value)} onCompositionStart={()=>{composing.current=true;}} onCompositionEnd={()=>{composing.current=false;}} disabled={!ready||pending||selection.stage!=='editing'} placeholder="Enter nickname" autoComplete="nickname" spellCheck={false} className="brick-nickname" style={inputTextStyle}/>
          </div>
        </div>
      </div>
      </div>
      <div ref={bottom} className="brick-copy brick-form-bottom" style={{visibility:ready&&values.title?undefined:'hidden'}} inert={!ready||selection.stage!=='editing'}>
        <p id={`rules-${id}`} className={emailStep?"sr-only":"family-name-hint"}>First name or nickname · 2–12 characters</p>
        {errors.name&&<p className="brick-error" id={`name-error-${id}`} role="alert">{errors.name}</p>}
        {emailStep&&<div className="brick-email-step">
          <label htmlFor={`email-${id}`}>Email address</label>
          <p id={`email-help-${id}`}>Your email helps you find your brick again. You can save your brick here after joining.</p>
          <input ref={email} id={`email-${id}`} type="email" autoComplete="email" value={values.email} onChange={e=>update('email',e.target.value)} disabled={pending} aria-describedby={`email-help-${id}${errors.email?` email-error-${id}`:''}`} aria-invalid={!!errors.email}/>
          <label className="brick-marketing-choice">
            <input type="checkbox" checked={marketingConsent} onChange={event=>setMarketingConsent(event.target.checked)} disabled={pending} />
            <span>{FAMILY_MARKETING_COPY} (Optional)</span>
          </label>
          {errors.email&&<p id={`email-error-${id}`} className="brick-error" role="alert">{errors.email}</p>}
        </div>}
        {errors.root&&<p className="brick-error" role="alert">{errors.root}</p>}
        <button type="submit" aria-describedby={emailStep?`email-help-${id}`:undefined} data-testid="button-submit" className={`gj-cta family-primary-action brick-submit${emailStep?'':' brick-continue'}`} disabled={!ready||pending||selection.moving}><span className="brick-button-label">{pending?'Adding…':emailStep?'Join the family':'Continue to email'}</span></button>
        <span role="status" className="sr-only">{pending?'Adding your brick. Please wait.':''}</span>
      </div>
      <div className="brick-secondary-actions">
        {values.title&&<button type="button" className="gj-cta gj-cta--quiet brick-change-title" disabled={pending||selection.moving} onClick={goBack}>
          <svg aria-hidden="true" viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 6 4 16l10 10M4 16h24"/></svg>
          <span>{emailStep?"Back to name":"Change title"}</span>
        </button>}
        <button type="button" className="gj-cta brick-secondary-wall family-wall-invite" disabled={pending||selection.moving} onClick={onWallOnly}>See the family<span aria-hidden="true">↗</span></button>
      </div>
    </form>
  </div>;
}
