import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { FamilyMember } from "@/lib/mockData";
import { Brick } from "./Brick";

interface WallProps {
  members: FamilyMember[];
  newestMemberId?: string | null;
  highlightedMemberId?: string | null;
  flyByMember?: FamilyMember | null;
}

export function Wall({ members, newestMemberId, highlightedMemberId, flyByMember }: WallProps) {
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
    <div className="fixed inset-0 z-0 overflow-hidden bg-black">
      <div className="absolute inset-0 bg-[url('https://replit.com/public/images/noise.png')] opacity-5 mix-blend-overlay pointer-events-none"></div>


      <div className="w-full h-full flex flex-col gap-8 p-4 scale-105 origin-center justify-center relative">
        {rows.map((rowMembers, i) => (
          <div key={i} className="contents">
            <MarqueeRow
              members={rowMembers}
              direction={directions[i]}
              speed={speeds[i]}
              highlightedMemberId={highlightedMemberId}
            />
            {i === 2 && flyByMember && (
              <FlyByRow members={rowMembers} member={flyByMember} />
            )}
          </div>
        ))}
      </div>

      {/* Gradient Overlay for Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,black_100%)] opacity-60 pointer-events-none"></div>
    </div>
  );
}

function FlyByRow({ members, member }: { members: FamilyMember[]; member: FamilyMember }) {
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
      animate={{ height: 55, opacity: 1, y: 0 }}
      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className="flex min-w-max gap-8"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 80, ease: "linear", repeat: Infinity }}
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

function MarqueeRow({ members, direction, speed, highlightedMemberId }: { members: FamilyMember[], direction: "left" | "right", speed: number, highlightedMemberId?: string | null }) {
  return (
    <div className="flex overflow-hidden w-full relative">
      <motion.div
        className="flex gap-8 min-w-max"
        animate={{
          x: direction === "left" ? ["0%", "-50%"] : ["-50%", "0%"],
        }}
        transition={{
          duration: speed,
          ease: "linear",
          repeat: Infinity,
        }}
      >
        {/* Render enough items to loop seamlessly */}
        {[...members, ...members, ...members].map((member, i) => {
          return (
            <Brick
              key={`${member.title}-${member.name}-${i}`}
              member={member}
              highlight={member.id === highlightedMemberId}
            />
          );
        })}
      </motion.div>
    </div>
  );
}
