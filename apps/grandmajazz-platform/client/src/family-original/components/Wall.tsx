import { Fragment, memo, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
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
  flyByMember?: FamilyMember | null;
  paused?: boolean;
  browsable?: boolean;
}

export const Wall = memo(function Wall({ members, newestMemberId, highlightedMemberId, flyByMember, paused=false, browsable=false }: WallProps) {
  const reducedMotion = useSyncExternalStore(subscribeMotion, motionSnapshot, () => true);
  // Stable assignments preserve the scrolling position when the form opens/closes.
  const rows = useMemo(() => {
    const membersPerRow = Math.ceil(members.length / 7);
    return Array.from({ length: 7 }, (_, i) => members.slice(i * membersPerRow, (i + 1) * membersPerRow));
  }, [members]);

  const speeds = [400, 480, 360, 420, 320, 500, 380];
  const directions: ("left" | "right")[] = ["left", "right", "left", "right", "left", "right", "left"];
  
  return (
    <div className="family-moving-wall fixed inset-0 z-0 overflow-hidden bg-black" data-paused={paused} data-browsable={browsable}>

      
      
      <div className="w-full h-full flex flex-col gap-0 p-4 origin-center justify-center relative">
        {rows.map((rowMembers, i) => (
          <Fragment key={i}>
            <MarqueeRow
              members={rowMembers}
              direction={directions[i]}
              speed={speeds[i]}
              reducedMotion={reducedMotion}
              paused={paused}
              browsable={browsable}
              highlightedMemberId={highlightedMemberId}
            />
            {i === 2 && flyByMember && (
              <FlyByRow members={rowMembers} member={flyByMember} reducedMotion={reducedMotion} paused={paused} browsable={browsable} />
            )}
          </Fragment>
        ))}
      </div>
      
      {/* Gradient Overlay for Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,black_100%)] opacity-60 pointer-events-none"></div>
    </div>
  );
});

function FlyByRow({ members, member, reducedMotion, paused, browsable }: { members: FamilyMember[]; member: FamilyMember; reducedMotion: boolean; paused: boolean; browsable: boolean }) {
  const flyByMembers = useMemo(() => {
    const surrounding = members.filter(item => item.id !== member.id).slice(0, 14);
    return [...surrounding.slice(0, 7), member, ...surrounding.slice(7)];
  }, [members, member]);
  return (
    <motion.div
      className="family-flyby-row w-full shrink-0 overflow-hidden relative"
      initial={{ height: 0, opacity: 0, y: -14 }}
      animate={{ height: 110.24, opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : 1.2, ease: [0.22, 1, 0.36, 1] }}
    >
      <MarqueeRow members={flyByMembers} direction="left" speed={80} reducedMotion={reducedMotion} paused={paused} browsable={browsable} />
    </motion.div>
  );
}

const MarqueeRow = memo(function MarqueeRow({ members, direction, speed, highlightedMemberId, reducedMotion, paused, browsable }: {
  members: FamilyMember[]; direction: "left" | "right"; speed: number;
  highlightedMemberId?: string | null; reducedMotion: boolean; paused: boolean; browsable: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef({ paused, reducedMotion, browsable, highlightedMemberId });
  controlsRef.current = { paused, reducedMotion, browsable, highlightedMemberId };

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track || !members.length) return;
    // Only viewport-sized artwork is mounted. Offscreen buffers are recycled
    // before paint while the native scroll area retains the complete list.
    return createWallWindow(track, members, {
      direction,
      pixelsPerSecond: Math.min(70, Math.max(18, members.length * 272 / speed)),
      controls: () => controlsRef.current,
      artwork: member => brickSvg(member.title, member.name, brickFrameUrl),
      turn: (node, member) => createWallBrickTurn(node, member, brickFrameUrl, () => controlsRef.current.reducedMotion),
    });
  }, [members, direction, speed]);

  return (
    <div className="family-marquee-row shrink-0 w-full relative" aria-hidden={!browsable} tabIndex={browsable ? 0 : undefined} aria-label={browsable ? "Family members — swipe to browse" : undefined}>
      <div className="family-marquee-space"><div ref={trackRef} className="family-marquee-track" /></div>
    </div>
  );
});
