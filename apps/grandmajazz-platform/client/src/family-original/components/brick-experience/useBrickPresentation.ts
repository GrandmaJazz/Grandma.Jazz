import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { BRICK_TIMELINE as T, frameAt, ramp, canPlayIntro, snapshotSequence, smooth, writeSession } from './timeline';
import { readReelHistory, selectFreshReel, writeReelHistory } from './reelSelection';
type RecordPair = {title: string; name: string};
export function useBrickPresentation(root: RefObject<HTMLDivElement | null>, host: RefObject<HTMLDivElement | null>, records: readonly RecordPair[], dataReady: boolean, draft: boolean, loadFreshRecords: () => Promise<readonly RecordPair[]>) {
  const [ready, setReady] = useState(() => draft || !canPlayIntro() || window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [sequence, setSequence] = useState<ReturnType<typeof snapshotSequence>>(() => snapshotSequence([]));
  const [prepared, setPrepared] = useState(false);
  const [playback, setPlayback] = useState(0);
  const latest = useRef({records,dataReady}); latest.current = {records,dataReady};
  const freshLoader = useRef(loadFreshRecords); freshLoader.current = loadFreshRecords;
  const controls = useRef({finish: () => {}});
  const completed = useRef(ready);
  const started = useRef(0);
  const skipRequested = useRef(false);
  const restoreReplayFocus = useRef(false);
  const finish = () => controls.current.finish();

  const replay = () => {
    if (!ready || !completed.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    restoreReplayFocus.current = document.activeElement?.getAttribute('data-replay-intro') === 'true';
    skipRequested.current = false;
    completed.current = false;
    setPrepared(false);
    setReady(false);
    setPlayback(value => value + 1);
  };

  useLayoutEffect(() => {
    if (ready) return;
    let disposed=false, settled=false, raf=0, fontsReady=false, fontsFailed=false;
    let replayRecords:readonly RecordPair[]|null=null, replayFetchDone=playback===0;
    const start=performance.now();
    if(playback>0) freshLoader.current().then(records=>{if(!disposed && !settled)replayRecords=records;},()=>{}).finally(()=>{replayFetchDone=true;});
    if(!document.fonts?.load) fontsFailed=true;
    else document.fonts.load('300 440px Roboto').then(()=>{ fontsReady=document.fonts.check('300 440px Roboto'); fontsFailed=!fontsReady; },()=>{fontsFailed=true;});
    const check=()=>{
      if(disposed || settled || completed.current)return;
      if(skipRequested.current || fontsFailed || (fontsReady && (playback>0?replayFetchDone:latest.current.dataReady)) || performance.now()-start>=T.prepareLimit){
        settled=true;
        const {sequence:items,history}=selectFreshReel(replayRecords??latest.current.records,readReelHistory(),Date.now());
        writeReelHistory(history);
        setSequence(items); setPrepared(true);
        if(!fontsReady || items.length===2) skipRequested.current=true;
      }else raf=requestAnimationFrame(check);
    };
    raf=requestAnimationFrame(check);
    const deadline=window.setTimeout(check,T.prepareLimit+1);
    return()=>{disposed=true;cancelAnimationFrame(raf);clearTimeout(deadline);};
  },[playback]);

  useLayoutEffect(()=>{
    const el=root.current, brick=host.current;
    if(!el || !brick)return;
    let alive=true, raf=0, deadline=0, shortStart:number|null=null;
    let offset={x:0,y:0,scale:1}, shortOrigin={...offset};
    let current={x:0,y:0,scale:1};
    let rebase: {at:number; from:typeof current}|null=null;
    let lastMorph=0;
    const track=el.querySelector<SVGGElement>('[data-reel-track]')!;
    const measure=()=>{
      // Remove only the presentation transform to measure the reserved final box.
      const visual=brick.getBoundingClientRect();
      const transform=brick.style.transform;brick.style.transform='none';
      const b=brick.getBoundingClientRect(); const stage=el.parentElement!.getBoundingClientRect();
      brick.style.transform=transform;
      const width=Math.min(innerWidth*.7,560,innerWidth-32);
      const startHeight=width*1630/5000;
      offset={x:innerWidth/2-width/2-b.left,y:Math.max(stage.top,0)+(Math.max(0,Math.min(innerHeight,stage.bottom)-Math.max(stage.top,0))-startHeight)/2-b.top,scale:width/b.width};
      if(!completed.current && lastMorph>0 && lastMorph<1)rebase={at:lastMorph,from:{x:visual.left-b.left,y:visual.top-b.top,scale:visual.width/b.width}};
      if(shortStart!==null)shortOrigin={...current};
    };
    const paint=(time:number, overrideMorph?:number)=>{
      const f=frameAt(time,sequence.length);
      const m=overrideMorph??f.morph;lastMorph=m;
      let origin=shortStart===null?offset:shortOrigin;
      let progress=m;
      if(rebase && shortStart===null){origin=rebase.from;progress=(m-rebase.at)/(1-rebase.at);}
      current={x:origin.x*(1-progress),y:origin.y*(1-progress),scale:origin.scale+(1-origin.scale)*progress};
      brick.style.transform=progress>=1?'none':`translate(${current.x}px, ${current.y}px) scale(${current.scale})`;
      track.setAttribute('transform',`translate(0 ${f.trackY})`);
      el.style.setProperty('--intro-text',String(f.textOpacity));
      el.style.setProperty('--intro-veil',String(f.veilOpacity));
      el.style.setProperty('--intro-content',String(f.content));
      el.style.setProperty('--intro-name',String(f.nicknameOpacity));
      el.style.setProperty('--intro-controls',String(f.controls));
      el.dataset.phase=f.phase;
    };
    const done=()=>{
      if(!alive || completed.current)return;
      completed.current=true;cancelAnimationFrame(raf);clearTimeout(deadline);
      // Finishing remains safe even when animation enhancement failed.
      brick.style.removeProperty('transform');
      el.dataset.phase='READY';
      writeSession(T.sessionKey,'done');setReady(true);

    };
    const brief=()=>{
      if(completed.current || shortStart!==null)return;
      shortStart=performance.now();shortOrigin={...current};
    };
    controls.current={finish:done};
    measure();
    const resize=()=>{if(!completed.current){measure();}};
    window.addEventListener('resize',resize);
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    const motionChange=()=>{if(media.matches)done();};media.addEventListener('change',motionChange);
    let wasHidden=document.hidden;
    const visibility=()=>{if(document.hidden)wasHidden=true;else if(wasHidden){wasHidden=false;brief();}};
    document.addEventListener('visibilitychange',visibility);
    if(ready){paint(T.ready,1);writeSession(T.sessionKey,'done');if(restoreReplayFocus.current)el.querySelector<HTMLElement>('h1')?.focus({preventScroll:true});}
    else if(prepared){
      started.current=performance.now();
      if(skipRequested.current)brief();
      const tick=(now:number)=>{
        if(!alive || completed.current)return;
        if(shortStart!==null){
          const elapsed=now-shortStart;
          const m=smooth((elapsed-T.skipHold)/(T.skipDuration-T.skipHold));
          const synthetic=elapsed<T.skipHold?(T.reel[1]+T.morph[0])/2:T.content[0]+(T.content[1]-T.content[0])*m;
          paint(synthetic,m);
          if(elapsed>=T.skipDuration){done();return;}
        }else{
          const elapsed=now-started.current;paint(elapsed);
          if(elapsed>=T.ready){done();return;}
        }
        raf=requestAnimationFrame(tick);
      };
      raf=requestAnimationFrame(tick);
      deadline=window.setTimeout(done,T.deadline);
    }else {paint(0);el.dataset.phase='PREPARE';}
    return()=>{alive=false;cancelAnimationFrame(raf);clearTimeout(deadline);window.removeEventListener('resize',resize);media.removeEventListener('change',motionChange);document.removeEventListener('visibilitychange',visibility);};
  },[prepared,sequence,ready]);
  useEffect(()=>{if(ready)completed.current=true;},[ready]);
  return {ready,sequence,finish,replay};
}
