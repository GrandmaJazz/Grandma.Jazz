import { useEffect, useId, useRef, useState, type PointerEvent } from 'react';
import { Badge } from './Brick';
import { BrickButtonFrame } from './BrickButtonFrame';
import { BRICK_FRAME, BRICK_LAYOUT as L, brickLetters } from '@shared/family-original/brickArtwork';
import { useBrickPresentation } from './brick-experience/useBrickPresentation';
import { BRICK_EDGE_CONTOUR } from './brick-experience/brickEdgeContour';
import type { FamilyMember } from '@/family-original/lib/mockData';
import './welcome-brick.css';

const normalise = (angle: number) => ((angle % 360) + 360) % 360;
const ease = (t: number) => t*t*t*(t*(6*t-15)+10);
const edgeSegments = BRICK_EDGE_CONTOUR.map(([x,y],i) => {
  const [nextX,nextY]=BRICK_EDGE_CONTOUR[(i+1)%BRICK_EDGE_CONTOUR.length];
  return {
    left:`${(x+nextX)/2/5000*100}%`, top:`${(y+nextY)/2/1630*100}%`,
    width:`calc(${Math.hypot(nextX-x,nextY-y)/5000*100}% + .25px)`,
    transform:`translate(-50%, -50%) rotate(${Math.atan2(nextY-y,nextX-x)*180/Math.PI}deg) rotateX(90deg)`,
  };
});

export function WelcomeBrick({ member, existing, onSave, saving, error, publicRecords, dataReady, loadFreshRecords, playCelebration=true, onCelebrationComplete }: {
  member: FamilyMember; existing: boolean; onSave: () => void; saving: boolean; error: string;
  publicRecords: FamilyMember[]; dataReady: boolean; loadFreshRecords:()=>Promise<FamilyMember[]>;
  playCelebration?:boolean; onCelebrationComplete?:()=>void;
}) {
  const presentationRoot=useRef<HTMLDivElement>(null),presentationHost=useRef<HTMLDivElement>(null);
  const {ready,sequence,replay}=useBrickPresentation(presentationRoot,presentationHost,publicRecords,dataReady,false,loadFreshRecords,member,playCelebration);
  useEffect(()=>{if(ready)onCelebrationComplete?.();},[ready,onCelebrationComplete]);
  const clipId=`welcome-reel-${useId().replace(/:/g,'')}`;
  const rotor = useRef<HTMLDivElement>(null);
  const angle = useRef(0), frame = useRef(0), nudgeTimer = useRef(0);
  const reduced = useRef(false), suppressClick = useRef(false), side = useRef(false);
  const drag = useRef<{id:number; startX:number; lastX:number; time:number; velocity:number; width:number; moved:boolean}|null>(null);
  const [back, setBack] = useState(false);
  const [interacted, setInteracted] = useState(false);

  const cancel = () => { cancelAnimationFrame(frame.current); clearTimeout(nudgeTimer.current); };
  const paint = (value: number) => {
    angle.current = value;
    if (rotor.current) rotor.current.style.transform = `rotateY(${value}deg)`;
  };
  const rest = (value: number) => {
    paint(normalise(value));
    side.current = Math.round(normalise(value)/180)%2 === 1;
    setBack(side.current);
    if (rotor.current) rotor.current.dataset.spinning = 'false';
  };
  const settle = (target: number, duration = 450) => {
    cancel();
    if (reduced.current) { rest(target); return; }
    const from = angle.current, start = performance.now();
    if (rotor.current) rotor.current.dataset.spinning = 'true';
    const tick = (now: number) => {
      const t = Math.min(1, (now-start)/duration);
      paint(from+(target-from)*ease(t));
      if (t < 1) frame.current = requestAnimationFrame(tick); else rest(target);
    };
    frame.current = requestAnimationFrame(tick);
  };
  const turn = () => {setInteracted(true);settle(Math.round(angle.current/180)*180+180, 650);};
  const coast = (velocity: number) => {
    cancel();
    if (reduced.current) { turn(); return; }
    let previous = performance.now();
    if (rotor.current) rotor.current.dataset.spinning = 'true';
    const tick = (now: number) => {
      const dt = (now-previous)/1000; previous=now;
      // Exponential drag is elapsed-time based, so momentum feels the same
      // on 60 Hz and 120 Hz displays. Finish on a readable, flat face.
      const decay = Math.exp(-2.4*dt);
      paint(angle.current+velocity*(1-decay)/2.4);
      velocity *= decay;
      if (Math.abs(velocity)>30) frame.current=requestAnimationFrame(tick);
      else settle(Math.round(angle.current/180)*180, 350);
    };
    frame.current=requestAnimationFrame(tick);
  };
  const pointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (!event.isPrimary || event.button !== 0) return;
    setInteracted(true);
    cancel(); suppressClick.current=false;
    drag.current={id:event.pointerId,startX:event.clientX,lastX:event.clientX,time:performance.now(),velocity:0,width:event.currentTarget.clientWidth,moved:false};
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const pointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const state=drag.current;
    if (!state || state.id!==event.pointerId) return;
    const now=performance.now(), dx=event.clientX-state.lastX, dt=Math.max(1,now-state.time);
    state.moved ||= Math.abs(event.clientX-state.startX)>5;
    const degrees=dx/state.width*360;
    state.velocity=Math.max(-2400,Math.min(2400,.75*degrees/dt*1000+.25*state.velocity));
    state.lastX=event.clientX; state.time=now;
    if(state.moved && !reduced.current) paint(angle.current+degrees);
  };
  const pointerEnd = (event: PointerEvent<HTMLButtonElement>, cancelled=false) => {
    const state=drag.current;
    if(!state || state.id!==event.pointerId)return;
    drag.current=null;
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
    suppressClick.current=state.moved;
    if(cancelled)settle(Math.round(angle.current/180)*180);
    else if(state.moved)coast(performance.now()-state.time>120?0:state.velocity);
    else if(Math.abs(angle.current%180)>.01)settle(Math.round(angle.current/180)*180);
  };

  useEffect(()=>{
    if(!ready)return;
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    reduced.current=media.matches;
    const motionChange=()=>{reduced.current=media.matches;if(media.matches){cancel();drag.current=null;rest(Math.round(angle.current/180)*180);}};
    const hidden=()=>{if(document.hidden){cancel();drag.current=null;rest(Math.round(angle.current/180)*180);}};
    media.addEventListener('change',motionChange);document.addEventListener('visibilitychange',hidden);
    if(!media.matches&&playCelebration)nudgeTimer.current=window.setTimeout(()=>{
      const start=performance.now();
      if(rotor.current)rotor.current.dataset.spinning='true';
      const tick=(now:number)=>{
        const t=Math.min(1,(now-start)/3200);
        // One full turn, pausing on the discount before returning to their name.
        const degrees=t<.32?180*ease(t/.32):t<.68?180:180+180*ease((t-.68)/.32);
        paint(degrees);
        if(t<1)frame.current=requestAnimationFrame(tick);else rest(0);
      };
      frame.current=requestAnimationFrame(tick);
    },650);
    return()=>{cancel();media.removeEventListener('change',motionChange);document.removeEventListener('visibilitychange',hidden);};
  },[ready]);

  return <main className="welcome-stage pointer-events-auto" aria-labelledby="welcome-heading">
    <div className="welcome-wall-dim" aria-hidden="true" />
    <div ref={presentationRoot} className="welcome-content" data-ready={ready}>
      <h1 id="welcome-heading" tabIndex={-1}>{!ready?'Finding your place…':existing?'Welcome back':'Welcome to the family'}</h1>
      <div ref={presentationHost} className="welcome-brick-host">
      <svg style={{visibility:ready?'hidden':undefined}} className="welcome-name-reel" viewBox={`0 0 ${L.width} ${L.height}`} aria-hidden="true">
        <g dangerouslySetInnerHTML={{__html:BRICK_FRAME}}/>
        <defs><clipPath id={clipId}><rect x={L.clip.x} y={L.clip.y} width={L.clip.width} height={L.clip.height} rx={L.clip.radius}/></clipPath></defs>
        <g clipPath={`url(#${clipId})`}><g data-reel-track className="brick-reel">
          {sequence.map((record,i)=><g key={i} data-record={i} data-reel-terminal={i===sequence.length-1?true:undefined} transform={`translate(0 ${i*L.height})`}><g dangerouslySetInnerHTML={{__html:brickLetters(record.title,record.name)}}/></g>)}
        </g></g>
      </svg>
      <button type="button" className="welcome-spinner" data-testid="brick-welcome-display"
        disabled={!ready} data-ready={ready}
        aria-label={back?'Turn to the front of your brick':'Turn to reveal your 10% discount'}
        aria-describedby="welcome-spin-help"
        onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={event=>pointerEnd(event)}
        onPointerCancel={event=>pointerEnd(event,true)} onLostPointerCapture={event=>{if(drag.current)pointerEnd(event,true);}}
        onClick={event=>{if(suppressClick.current && event.detail!==0){suppressClick.current=false;return;}suppressClick.current=false;turn();}}>
        <div ref={rotor} className="welcome-rotor" data-side={back?'back':'front'} data-spinning="false">
          <div className="welcome-edge-shell" aria-hidden="true">
            {edgeSegments.map((style,i)=><span key={i} className="welcome-edge" style={style}/>)}
          </div>
          <div className="welcome-face welcome-front" aria-hidden="true"><Badge title={member.title} name={member.name}/></div>
          <div className="welcome-face welcome-back" aria-hidden="true">
            <svg viewBox="0 0 5000 1630" className="welcome-discount">
              <g dangerouslySetInnerHTML={{__html:BRICK_FRAME}}/>
              <g textAnchor="middle" fill="#fff" fontFamily="Roboto, Arial, sans-serif" fontWeight="300">
                <text x="2500" y="425" fontSize="265" fill="#B49B73">Your 10% discount</text>
                <text x="2500" y="765" fontSize="210">1. Walk up to the Budtender.</text>
                <text x="2500" y="1040" fontSize="210">2. Say “Thanks Grandma”.</text>
                <text x="2500" y="1315" fontSize="210">3. Wink with one eye.</text>
              </g>
            </svg>
          </div>
        </div>
      </button>
      </div>
      <div className="welcome-actions" inert={!ready}>
      <div className="welcome-turn-copy">
        <button type="button" className="welcome-turn" onClick={turn} id="welcome-spin-help">
          <span className="welcome-swipe-track" aria-hidden="true"><span>←</span><span className="welcome-swipe-dot" data-active={!interacted}>◉</span><span>→</span></span>
          <span>{back?'Swipe to see your brick':'Swipe for your 10% discount'}</span>
        </button>
      </div>
      <p role="status" className="sr-only">{back?'Your 10% discount: 1. Walk up to the Budtender. 2. Say “Thanks Grandma”. 3. Wink with one eye.':`${member.title} ${member.name}`}</p>
      <button type="button" className="brick-shape-button welcome-save" onClick={onSave} disabled={saving} data-testid="button-save-brick">
        <BrickButtonFrame/><span className="brick-button-label">{saving?'Saving…':'Save your brick'}</span>
      </button>
      {error&&<p role="alert" className="welcome-error">{error}</p>}
      <nav className="welcome-links" aria-label="Grandma Jazz links">
        <a href="https://www.instagram.com/grandmajazzphuket" target="_blank" rel="noopener noreferrer" data-testid="button-instagram-follow"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".75" fill="currentColor"/></svg>Instagram</a>
        <a href="https://www.grandmajazz.com/" target="_top" data-testid="button-go-to-website"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m3 11 9-8 9 8M5 9v12h14V9M9 21v-8h6v8"/></svg>Grandma Jazz</a>
      </nav>
      </div>
      {ready&&<button type="button" className="brick-replay" data-replay-intro="true" aria-label="Replay your welcome" onClick={replay}><svg aria-hidden="true" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10a9 9 0 1 1 2.7 8.4M3 4v6h6"/></svg></button>}
    </div>
  </main>;
}
