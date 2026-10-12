import { memo, useEffect, useRef, useSyncExternalStore, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { FamilyMember } from "@/family-original/lib/mockData";
import { Brick } from "./Brick";

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
  flyByMember?: FamilyMember | null;
  paused?: boolean;
}

export const Wall = memo(function Wall({ members, newestMemberId, highlightedMemberId, flyByMember, paused=false }: WallProps) {
  const reducedMotion = useSyncExternalStore(subscribeMotion, motionSnapshot, () => true);
  const prevMembersRef = useRef<FamilyMember[]>([]);
  
  useEffect(() => {
    if (newestMemberId && members.length > prevMembersRef.current.length) {
      prevMembersRef.current = members;
    }
  }, [newestMemberId]);
  
  // Distribute all members across 7 rows
  const numRows = 7;
  const membersPerRow = Math.ceil(members.length / numRows);
  
  // Create row assignments - each row gets a unique slice of members
  const rows = Array.from({ length: numRows }, (_, i) => {
    const start = i * membersPerRow;
    const end = Math.min(start + membersPerRow, members.length);
    return members.slice(start, end);
  });
  
  const speeds = [400, 480, 360, 420, 320, 500, 380];
  const directions: ("left" | "right")[] = ["left", "right", "left", "right", "left", "right", "left"];
  
  return (
    <div className="family-moving-wall fixed inset-0 z-0 overflow-hidden bg-black" data-paused={paused}>

      
      
      <div className="w-full h-full flex flex-col gap-8 p-4 origin-center justify-center relative">
        {rows.map((rowMembers, i) => (
          <div key={i} className="contents">
            <MarqueeRow
              members={rowMembers}
              direction={directions[i]}
              speed={speeds[i]}
              reducedMotion={reducedMotion}
              highlightedMemberId={highlightedMemberId}
            />
            {i === 2 && flyByMember && (
              <FlyByRow members={rowMembers} member={flyByMember} reducedMotion={reducedMotion} />
            )}
          </div>
        ))}
      </div>
      
      {/* Gradient Overlay for Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,black_100%)] opacity-60 pointer-events-none"></div>
    </div>
  );
});

function FlyByRow({ members, member, reducedMotion }: { members: FamilyMember[]; member: FamilyMember; reducedMotion: boolean }) {
  const surroundingMembers = members
    .filter((item) => item.id !== member.id)
    .slice(0, 14);
  const flyByMembers = [
    ...surroundingMembers.slice(0, 7),
    member,
    ...surroundingMembers.slice(7),
  ];
  const loopingMembers = [...flyByMembers, ...flyByMembers];

  return (
    <motion.div
      className="flex w-full shrink-0 overflow-hidden relative"
      initial={{ height: 0, opacity: 0, y: -14 }}
      animate={{ height: 78.24, opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : 1.2, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className="flex min-w-max gap-8"
        animate={{ x: reducedMotion ? "0%" : ["0%", "-50%"] }}
        transition={{ duration: reducedMotion ? 0 : 80, ease: "linear", repeat: reducedMotion ? 0 : Infinity }}
      >
        {loopingMembers.map((item, index) => (
          <Brick
            key={`${item.id}-flyby-${index}`}
            member={item}
          />
        ))}
      </motion.div>
    </motion.div>
  );
}

function MarqueeRow({ members, direction, speed, highlightedMemberId, reducedMotion }: { members: FamilyMember[], direction: "left" | "right", speed: number, highlightedMemberId?: string | null; reducedMotion: boolean }) {
  return (
    <div className="flex shrink-0 overflow-hidden w-full relative">
      <div className="family-marquee-track" data-reduced={reducedMotion} style={{'--wall-duration':`${speed}s`,animationDirection:direction==='left'?'normal':'reverse'} as CSSProperties}>
        {/* Equal groups include their trailing gap, so loop boundaries match. */}
        {[0,1].map(copy=><div className="family-marquee-group" key={copy} aria-hidden={copy===1?true:undefined}>
          {members.map((member,i)=><Brick key={`${member.id}-${i}`} member={member} highlight={member.id===highlightedMemberId}/>)}
        </div>)}
      </div>
    </div>
  );
}
