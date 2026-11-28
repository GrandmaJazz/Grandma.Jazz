import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import { Badge } from './Brick';
import { BRICK_FRAME, BRICK_LAYOUT as L, brickLetters } from '@shared/family-original/brickArtwork';
import { useBrickPresentation } from './brick-experience/useBrickPresentation';
import { bindFamilyIdleArrival } from './brick-experience/familyIdleArrival';
import { BRICK_EDGE_CONTOUR } from './brick-experience/brickEdgeContour';
import { BRICK_BODY, convexHull, projectBrickDepth, type Point } from './brick-experience/brickDepth';
import { planBrickCoast, brickCoastProgress } from './brick-experience/brickCoast';
import { createBrickHaptics } from './brick-experience/brickHaptics';
import type { FamilyMember } from '@/family-original/lib/mockData';
import './welcome-brick.css';
import { InstagramButtonLogo } from '../../../../../../shared/site/InstagramButtonLogo';
import CarouselSpeedControl from '../../../../../../src/components/CarouselSpeedControl';

const normalise = (angle: number) => ((angle % 360) + 360) % 360;
const ease = (t: number) => t*t*t*(t*(6*t-15)+10);

export function WelcomeBrick({ member, existing, onSave, saving, error, saveHint, publicRecords, dataReady, loadFreshRecords, playCelebration=true, onCelebrationComplete, visible=true, autoIntegrate=false, onAutoIntegrate }: {
  member: FamilyMember; existing: boolean; onSave: () => void; saving: boolean; error: string; saveHint?: string;
  publicRecords: FamilyMember[]; dataReady: boolean; loadFreshRecords:()=>Promise<FamilyMember[]>;
  playCelebration?:boolean; onCelebrationComplete?:()=>void; visible?:boolean;
  autoIntegrate?:boolean; onAutoIntegrate?:()=>boolean;
}) {
  const presentationRoot=useRef<HTMLDivElement>(null),presentationHost=useRef<HTMLDivElement>(null);
  const {ready,sequence,prepared}=useBrickPresentation(presentationRoot,presentationHost,publicRecords,dataReady,false,loadFreshRecords,member,playCelebration);
  useEffect(()=>{if(ready)onCelebrationComplete?.();},[ready,onCelebrationComplete]);
  const rotor = useRef<HTMLDivElement>(null);
  const outline=useRef<SVGPathElement>(null),shell=useRef<SVGPathElement>(null);
  const depth=useRef({contour:BRICK_EDGE_CONTOUR as readonly Point[],width:350,half:6});
  const angle = useRef(0), frame = useRef(0);
  const reduced = useRef(false), suppressClick = useRef(false), side = useRef(false);
  const haptics=useRef<ReturnType<typeof createBrickHaptics>|null>(null);
  if(!haptics.current)haptics.current=createBrickHaptics(()=>reduced.current);
  const drag = useRef<{id:number; startX:number; lastX:number; time:number; velocity:number; width:number; moved:boolean}|null>(null);
  const [back, setBack] = useState(false);
  const railActive = useRef(false), railVelocity = useRef(0), playful = useRef(false);

  const cancel = () => { cancelAnimationFrame(frame.current); };
  const paint = (value: number) => {
    angle.current = value;
    if (rotor.current) rotor.current.style.transform = `rotateY(${value}deg)`;
    const {contour,width,half}=depth.current;
    shell.current?.setAttribute('d',projectBrickDepth(contour,value,width,half));
    haptics.current?.move(value);
  };
  const rest = (value: number) => {
    playful.current = false;
    haptics.current?.end();
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
  const turn = () => {
    // Only an intentional click/tap leaves the instruction side open.
    playful.current = false;
    const desired = side.current ? 0 : 180;
    const target = Math.round((angle.current - desired) / 360) * 360 + desired;
    settle(target, 650);
  };
  const coast = (velocity: number) => {
    cancel();
    playful.current = true;
    railVelocity.current = 0;
    if (reduced.current || document.hidden) { rest(0); return; }
    const from = angle.current;
    const { target, duration, tangent } = planBrickCoast(from, velocity);
    if (Math.abs(target - from) < .01) { rest(target); return; }
    const start = performance.now();
    if (rotor.current) rotor.current.dataset.spinning = 'true';
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      paint(from + (target - from) * brickCoastProgress(t, tangent));
      if (t < 1) frame.current = requestAnimationFrame(tick); else rest(target);
    };
    frame.current = requestAnimationFrame(tick);
  };
  // The album picker rail owns rotation while held; release carries its
  // exact angular velocity into the coast rather than braking immediately.
  const driveRail = (speed: number, seconds: number, heldSeconds: number) => {
    if (seconds === 0) {
      if (!railActive.current) return;
      railActive.current = false;
      coast(railVelocity.current);
      return;
    }
    if (!railActive.current) {
      cancel();
      haptics.current?.stop();
      railActive.current = true;
      playful.current = true;
      railVelocity.current = 0;
      if (rotor.current) rotor.current.dataset.spinning = 'true';
    }
    const direction = Math.sign(speed);
    const pressure = Math.abs(speed);
    const ramp = Math.min(1, heldSeconds / 2.4);
    const pace = (0.65 + pressure * 1.8) * (0.72 + ramp * 0.28);
    railVelocity.current = direction * pace * 180;
    if (!reduced.current && direction) paint(angle.current + railVelocity.current * seconds);
  };
  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0) return;
    haptics.current?.stop();
    if(event.pointerType==='touch'||event.pointerType==='pen')haptics.current?.begin(angle.current);
    cancel(); suppressClick.current=false;
    drag.current={id:event.pointerId,startX:event.clientX,lastX:event.clientX,time:performance.now(),velocity:0,width:presentationHost.current?.clientWidth||event.currentTarget.clientWidth,moved:false};
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state=drag.current;
    if (!state || state.id!==event.pointerId) return;
    const now=performance.now(), dx=event.clientX-state.lastX, dt=Math.max(1,now-state.time);
    state.moved ||= Math.abs(event.clientX-state.startX)>5;
    if(state.moved)playful.current=true;
    const degrees=dx/state.width*360;
    state.velocity=Math.max(-2400,Math.min(2400,.75*degrees/dt*1000+.25*state.velocity));
    state.lastX=event.clientX; state.time=now;
    if(state.moved && !reduced.current) paint(angle.current+degrees);
  };
  const pointerEnd = (event: PointerEvent<HTMLDivElement>, cancelled=false) => {
    const state=drag.current;
    if(!state || state.id!==event.pointerId)return;
    drag.current=null;
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
    suppressClick.current=state.moved;
    if(cancelled){haptics.current?.stop();coast(0);}
    else if(state.moved)coast(performance.now()-state.time>120?0:state.velocity);
    // A tap is handled by onClick; do not settle to the reverse before it runs.
  };

  useLayoutEffect(()=>{
    const path=outline.current;
    if(path&&typeof path.getTotalLength==='function'){
      const length=path.getTotalLength();
      depth.current.contour=convexHull(Array.from({length:512},(_,i)=>{
        const point=path.getPointAtLength(length*i/512);
        return [point.x+BRICK_BODY.x,point.y+BRICK_BODY.y] as Point;
      }));
    }
    const measure=()=>{
      const width=rotor.current?.parentElement?.clientWidth;
      if(width)depth.current.width=width;
      depth.current.half=Math.max(6,Math.min(9,window.innerWidth*.018));
      rotor.current?.style.setProperty('--brick-half-depth',`${depth.current.half}px`);
      paint(angle.current);
    };
    measure();
    if(typeof ResizeObserver==='undefined'){window.addEventListener('resize',measure);return()=>window.removeEventListener('resize',measure);}
    const observer=new ResizeObserver(measure);
    if(presentationHost.current)observer.observe(presentationHost.current);
    return()=>observer.disconnect();
  },[]);

  useEffect(()=>{
    if(!ready)return;
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    reduced.current=media.matches;
    const motionChange=()=>{reduced.current=media.matches;if(media.matches){haptics.current?.stop();cancel();drag.current=null;railActive.current=false;railVelocity.current=0;rest(playful.current?0:Math.round(angle.current/180)*180);}};
    const hidden=()=>{if(document.hidden){haptics.current?.stop();cancel();drag.current=null;railActive.current=false;railVelocity.current=0;rest(playful.current?0:Math.round(angle.current/180)*180);}};
    media.addEventListener('change',motionChange);document.addEventListener('visibilitychange',hidden);
    return()=>{haptics.current?.stop();cancel();media.removeEventListener('change',motionChange);document.removeEventListener('visibilitychange',hidden);};
  },[ready]);

  // Return to the member's name, not a reverse face or an interrupted spin.
  // This does not replay the one-time welcome celebration.
  const wasVisible = useRef(visible);
  useLayoutEffect(() => {
    if (visible && !wasVisible.current) {
      cancel(); haptics.current?.stop(); drag.current=null;
      railActive.current=false; railVelocity.current=0; suppressClick.current=false;
      rest(0);
    }
    wasVisible.current=visible;
  },[visible]);

  // One automatic turn on the initial welcome only, after a full five seconds
  // of inactivity. Complete the turn before the parent can integrate the brick.
  useEffect(()=>{
    if(!ready||!visible||!autoIntegrate||saving||!onAutoIntegrate)return;
    let automatic=false;
    const interrupt=()=>{
      if(!automatic)return;
      automatic=false;
      cancel();
      if(!document.hidden) settle(Math.round(angle.current/360)*360,450);
      else rest(0);
    };
    const start=()=>{
      if(reduced.current)return onAutoIntegrate();
      if(drag.current||railActive.current)return false;
      cancel(); haptics.current?.stop(); automatic=true; playful.current=true;
      const from=angle.current;
      const front=Math.round(from/360)*360;
      const startTime=performance.now();
      if(rotor.current)rotor.current.dataset.spinning='true';
      const tick=(now:number)=>{
        if(!automatic)return;
        const t=Math.min(1,(now-startTime)/3200);
        // Same slow original reveal, readable discount pause and name return.
        // If already on the instruction side, return gently to the front.
        const degrees=Math.abs(from-front)<.01
          ? front+(t<.32?180*ease(t/.32):t<.68?180:180+180*ease((t-.68)/.32))
          : from+(front-from)*ease(t);
        paint(degrees);
        if(t<1)frame.current=requestAnimationFrame(tick);
        else {automatic=false;rest(0);onAutoIntegrate();}
      };
      frame.current=requestAnimationFrame(tick);
      // The idle binding may re-arm on input if this turn is interrupted.
      return false;
    };
    const unbind=bindFamilyIdleArrival(document,window,start,5000,interrupt);
    const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotion=()=>{if(motion.matches&&automatic){automatic=false;cancel();rest(0);onAutoIntegrate();}};
    motion.addEventListener('change',onMotion);
    return()=>{unbind();motion.removeEventListener('change',onMotion);if(automatic){automatic=false;cancel();rest(0);}};
  },[ready,visible,autoIntegrate,saving,onAutoIntegrate]);

  return <main className="welcome-stage pointer-events-auto" aria-labelledby="welcome-heading" data-presenting={ready||prepared} inert={!ready&&!prepared}>
    <div className="welcome-wall-dim" aria-hidden="true" />
    <div ref={presentationRoot} className="welcome-content" data-ready={ready}>
      <h1 id="welcome-heading" tabIndex={-1}>{!ready?<>Finding your <span>place…</span></>:existing?<>Welcome <span>back.</span></>:<>Welcome to the <span>family.</span></>}</h1>
      <div className="welcome-swipe-zone" inert={!ready}
        onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={event=>pointerEnd(event)}
        onPointerCancel={event=>pointerEnd(event,true)} onLostPointerCapture={event=>{if(drag.current)pointerEnd(event,true);}}
        onClick={event=>{if(suppressClick.current && event.detail!==0){suppressClick.current=false;return;}suppressClick.current=false;turn();}}>
      <div ref={presentationHost} className="welcome-brick-host">
      <div style={{visibility:ready?'hidden':undefined}} className="welcome-name-reel" aria-hidden="true">
        <svg className="welcome-reel-frame" viewBox={`0 0 ${L.width} ${L.height}`}><g dangerouslySetInnerHTML={{__html:BRICK_FRAME}}/></svg>
        <div className="welcome-reel-window" style={{left:`${L.clip.x/L.width*100}%`,top:`${L.clip.y/L.height*100}%`,width:`${L.clip.width/L.width*100}%`,height:`${L.clip.height/L.height*100}%`,borderRadius:`${L.clip.radius/L.clip.width*100}% / ${L.clip.radius/L.clip.height*100}%`}}>
          <div data-reel-track className="brick-reel welcome-reel-track" style={{left:`${-L.clip.x/L.clip.width*100}%`,top:`${-L.clip.y/L.clip.height*100}%`,width:`${L.width/L.clip.width*100}%`,height:`${L.height/L.clip.height*100}%`}}>
            {sequence.map((record,i)=><svg className="welcome-reel-record" key={i} data-record={i} data-reel-terminal={i===sequence.length-1?true:undefined} viewBox={`0 0 ${L.width} ${L.height}`}><g dangerouslySetInnerHTML={{__html:brickLetters(record.title,record.name)}}/></svg>)}
          </div>
        </div>
      </div>
      <button type="button" className="welcome-spinner" data-testid="brick-welcome-display"
        disabled={!ready} data-ready={ready}
        aria-label={back?'Turn to the front of your brick':'Turn to reveal your 10% discount'}
        aria-describedby="welcome-spin-help">
        <svg className="welcome-depth-shell" viewBox="0 0 5000 1630" aria-hidden="true"><defs><path ref={outline} d={BRICK_BODY.path}/></defs><path ref={shell} fill="#fff"/></svg>
        <div ref={rotor} className="welcome-rotor" data-side={back?'back':'front'} data-spinning="false">
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
      <div className="welcome-turn-copy" id="welcome-spin-help"
        onPointerDown={event=>event.stopPropagation()} onClick={event=>event.stopPropagation()}>
        <CarouselSpeedControl
          name="Spin your family brick"
          label={back?'Hold and slide · tap brick to return':'Hold and slide · tap brick for your 10%'}
          disabled={!ready}
          onDrive={driveRail}
          onStep={direction=>coast(direction*360)}
        />
      </div>
      </div>
      <div className="welcome-actions" inert={!ready}>
      <p role="status" className="sr-only">{back?'Your 10% discount: 1. Walk up to the Budtender. 2. Say “Thanks Grandma”. 3. Wink with one eye.':`${member.title} ${member.name}`}</p>
      <button type="button" className="gj-cta family-primary-action welcome-save" onClick={onSave} disabled={saving} data-testid="button-save-brick">
        <span className="brick-button-label">{saving?'Saving…':'Save your brick'}</span>
      </button>
      {error&&<p role="alert" className="welcome-error">{error}</p>}
      {saveHint&&<p role="status" className="welcome-error">{saveHint}</p>}
      <nav className="welcome-links" aria-label="Grandma Jazz links">
        <a href="https://www.instagram.com/grandmajazzphuket" target="_blank" rel="noopener noreferrer" className="gj-cta gj-cta--quiet gj-cta--icon welcome-instagram" aria-label="Grandma Jazz on Instagram" title="Grandma Jazz on Instagram" data-testid="button-instagram-follow"><InstagramButtonLogo size={30}/></a>
      </nav>
      </div>
    </div>
  </main>;
}
