import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { FamilyMember } from "@/lib/mockData";

interface BrickProps {
  member: FamilyMember;
  className?: string;
  highlight?: boolean;
}

const BrickComponent = ({ member, className, highlight, layoutId }: BrickProps & { layoutId?: string }) => {
  return (
    <motion.div
      layoutId={layoutId}
      initial={{ opacity: 1, scale: 1 }}
      animate={highlight ? {
        opacity: 1,
        scale: [1, 1.05, 1],
        boxShadow: [
          "0 0 15px rgba(255,255,255,0.2)",
          "0 0 25px rgba(255,255,255,0.4)",
          "0 0 15px rgba(255,255,255,0.2)"
        ]
      } : { opacity: 1, scale: 1 }}
      transition={highlight ? {
        scale: { duration: 3, repeat: Infinity, ease: "easeInOut" },
        boxShadow: { duration: 3, repeat: Infinity, ease: "easeInOut" }
      } : undefined}
      className={cn(
        "relative flex flex-col items-end justify-center p-3 border-2 border-white/90 rounded-[10px] bg-black text-white transition-colors duration-300",
        "w-[160px] h-[55px]",
        highlight && "border-white z-50",
        className
      )}
    >
      <span className="text-[13px] md:text-[15px] font-galvji-light tracking-extra-wide text-right break-words w-full px-1.5 leading-tight">
        {member.title}
      </span>
      <span className="text-[13px] md:text-[15px] font-galvji-light tracking-extra-wide text-right w-full px-1.5">
        {member.name}
      </span>
    </motion.div>
  );
};

export const Brick = memo(BrickComponent);
