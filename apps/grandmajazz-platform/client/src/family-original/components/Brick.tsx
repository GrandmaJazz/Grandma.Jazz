import { memo } from "react";
import { cn } from "@/family-original/lib/utils";
import { FamilyMember } from "@/family-original/lib/mockData";
import { brickSvg } from "@shared/family-original/brickArtwork";

export function Badge({ title, name, className }: { title: string; name: string; className?: string }) {
  return <div className={cn("family-badge", className)} dangerouslySetInnerHTML={{ __html: brickSvg(title, name, `${import.meta.env.BASE_URL}brand/brick-frame.svg`) }} />;
}
export const Brick = memo(function Brick({ member, className, highlight }: { member: FamilyMember; className?: string; highlight?: boolean; layoutId?: string }) {
  return <Badge title={member.title} name={member.name} className={cn("family-wall-brick", highlight && "family-brick-highlight", className)} />;
});
