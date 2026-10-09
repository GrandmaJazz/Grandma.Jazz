import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Badge } from './Brick';
import { BrickButtonFrame } from './BrickButtonFrame';
import { BRICK_FRAME } from '@shared/family-original/brickArtwork';
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

export function WelcomeBrick({ member, existing, onSave, saving, error }: {
  member: FamilyMember; existing: boolean; onSave: () => void; saving: boolean; error: string;
}) {
  const rotor = useRef<HTMLDivElement>(null);
  const angle = useRef(0), frame = useRef(0), nudgeTimer = useRef(0);
  const reduced = useRef(false), suppressClick = useRef(false), side = useRef(false);
  const drag = useRef<{id:number; startX:number; lastX:number; time:number; velocity:number; width:number; moved:boolean}|null>(null);
  const [back, setBack] = useState(false);

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
  const turn = () => settle(Math.round(angle.current/180)*180+180, 650);
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
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    reduced.current=media.matches;
    const motionChange=()=>{reduced.current=media.matches;if(media.matches){cancel();drag.current=null;rest(Math.round(angle.current/180)*180);}};
    const hidden=()=>{if(document.hidden){cancel();drag.current=null;rest(Math.round(angle.current/180)*180);}};
    media.addEventListener('change',motionChange);document.addEventListener('visibilitychange',hidden);
    if(!media.matches)nudgeTimer.current=window.setTimeout(()=>{
      const start=performance.now();
      const tick=(now:number)=>{
        const t=Math.min(1,(now-start)/1300);
        paint(Math.sin(t*Math.PI*4)*11*(1-t));
        if(t<1)frame.current=requestAnimationFrame(tick);else rest(0);
      };
      frame.current=requestAnimationFrame(tick);
    },650);
    return()=>{cancel();media.removeEventListener('change',motionChange);document.removeEventListener('visibilitychange',hidden);};
  },[]);

  return <main className="welcome-stage pointer-events-auto" aria-labelledby="welcome-heading">
    <div className="welcome-wall-dim" aria-hidden="true" />
    <section className="welcome-content">
      <h1 id="welcome-heading">{existing?'Welcome back to the family':'Welcome to the family'}</h1>
      <button type="button" className="welcome-spinner" data-testid="brick-welcome-display"
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
      <div className="welcome-turn-copy">
        <button type="button" className="welcome-turn" onClick={turn}>
          {back?'Turn to see your brick →':'Turn to Reveal your 10% discount →'}
        </button>
        <p id="welcome-spin-help">Drag or swipe the brick to spin.</p>
      </div>
      <p role="status" className="sr-only">{back?'Your 10% discount: 1. Walk up to the Budtender. 2. Say “Thanks Grandma”. 3. Wink with one eye.':`${member.title} ${member.name}`}</p>
      <button type="button" className="brick-shape-button welcome-save" onClick={onSave} disabled={saving} data-testid="button-save-brick">
        <BrickButtonFrame/><span className="brick-button-label">{saving?'Saving…':'Save your brick'}</span>
      </button>
      {error&&<p role="alert" className="welcome-error">{error}</p>}
      <nav className="welcome-links" aria-label="Grandma Jazz links">
        <a href="https://www.instagram.com/grandmajazzphuket" target="_blank" rel="noopener noreferrer" data-testid="button-instagram-follow">Instagram ↗</a>
        <a href="https://www.grandmajazz.com/" target="_blank" rel="noopener noreferrer" data-testid="button-go-to-website">Grandmajazz.com ↗</a>
      </nav>
    </section>
  </main>;
}
