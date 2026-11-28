import { attachBrickBrush } from './brick-experience/brickBrush';
import { wallAccent } from './brick-experience/wallAccent';
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { FamilyMember } from "@/family-original/lib/mockData";
import { brickSvg } from "@shared/family-original/brickArtwork";
import brickFrameUrl from "../../../public/brand/brick-frame.svg";
import { createWallWindow } from "./wallMotion";
import { createWallBrickTurn } from "./wallBrickTurn";

const motionQuery = "(prefers-reduced-motion: reduce)";
const subscribeMotion = (notify: () => void) => {
  const media = window.matchMedia(motionQuery);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
const motionSnapshot = () => window.matchMedia(motionQuery).matches;

interface WallProps {
  members: FamilyMember[];
  newestMemberId?: string | null;
  highlightedMemberId?: string | null;
  paused?: boolean;
  browsable?: boolean;
  arrivalMember?: FamilyMember | null;
  arrivalHold?: boolean;
}

export const Wall = memo(function Wall({ members, newestMemberId, highlightedMemberId, paused=false, browsable=false, arrivalMember=null, arrivalHold=false }: WallProps) {
  const reducedMotion = useSyncExternalStore(subscribeMotion, motionSnapshot, () => true);
  // Stable assignments preserve the scrolling position when the form opens/closes.
  const rows = useMemo(() => {
    const membersPerRow = Math.ceil(members.length / 7);
    const assigned = Array.from({ length: 7 }, (_, i) => members.slice(i * membersPerRow, (i + 1) * membersPerRow));
    if (arrivalMember) {
      const source = assigned.findIndex(row => row.some(member => member.id === arrivalMember.id));
      if (source !== 3) {
        const record = source >= 0 ? assigned[source].find(member => member.id === arrivalMember.id)! : arrivalMember;
        if (source >= 0) assigned[source] = assigned[source].filter(member => member.id !== record.id);
        assigned[3].splice(Math.floor(assigned[3].length / 2), 0, record);
      }
    }
    return assigned;
  }, [members, arrivalMember]);

  const [ready,setReady] = useState(false);
  useEffect(()=>{
    if ((!members.length && !arrivalMember) || ready) return;
    let alive=true,frame=0;
    document.fonts.ready.then(()=>{
      if(alive) frame=requestAnimationFrame(()=>{if(alive)setReady(true);});
    });
    return()=>{alive=false;cancelAnimationFrame(frame);};
  },[members.length,ready,arrivalMember]);

  const speeds = [400, 480, 360, 420, 320, 500, 380];
  const directions: ("left" | "right")[] = ["left", "right", "left", "right", "left", "right", "left"];
  
  return (
    <div className="family-moving-wall fixed inset-0 z-0 overflow-hidden bg-black" data-paused={paused} data-browsable={browsable} data-ready={ready}>

      
      
      <div className="w-full h-full flex flex-col gap-0 p-4 origin-center justify-center relative">
        {rows.map((rowMembers, i) => (
            <MarqueeRow key={i}
              members={rowMembers}
              direction={directions[i]}
              speed={speeds[i]}
              reducedMotion={reducedMotion}
              paused={paused}
              browsable={browsable}
              highlightedMemberId={highlightedMemberId}
              arrivalHold={arrivalHold}
              centerMemberId={i===3 && arrivalHold ? arrivalMember?.id : null}
              central={i===3}
            />

        ))}
      </div>
      
      {/* Gradient Overlay for Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,black_100%)] opacity-60 pointer-events-none"></div>
    </div>
  );
});

const MarqueeRow = memo(function MarqueeRow({ members, direction, speed, highlightedMemberId, reducedMotion, paused, browsable, arrivalHold, centerMemberId, central }: {
  members: FamilyMember[]; direction: "left" | "right"; speed: number;
  highlightedMemberId?: string | null; reducedMotion: boolean; paused: boolean; browsable: boolean;
  arrivalHold: boolean; centerMemberId?: string | null; central: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef({ paused, reducedMotion, browsable, highlightedMemberId, arrivalHold, centerMemberId });
  controlsRef.current = { paused, reducedMotion, browsable, highlightedMemberId, arrivalHold, centerMemberId };

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track || !members.length) return;
    // Only viewport-sized artwork is mounted. Offscreen buffers are recycled
    // before paint while the native scroll area retains the complete list.
    const destroyWall = createWallWindow(track, members, {
      direction,
      pixelsPerSecond: Math.min(70, Math.max(18, members.length * 272 / speed)),
      controls: () => controlsRef.current,
      artwork: member => wallAccent(brickSvg(member.title, member.name, brickFrameUrl)),
      turn: (node, member) => createWallBrickTurn(node, member, brickFrameUrl, () => controlsRef.current.reducedMotion),
    });
    const stopBrush = attachBrickBrush(track.parentElement!.parentElement!, {
      selector: '.family-wall-brick', enabled: () => controlsRef.current.browsable,
    });
    return () => { stopBrush(); destroyWall(); };
  }, [members, direction, speed]);

  return (
    <div className="family-marquee-row shrink-0 w-full relative" data-arrival-row={central?"true":undefined} aria-hidden={!browsable} tabIndex={browsable ? 0 : undefined} aria-label={browsable ? "Family members — swipe to browse" : undefined}>
      <div className="family-marquee-space"><div ref={trackRef} className="family-marquee-track" /></div>
    </div>
  );
});
