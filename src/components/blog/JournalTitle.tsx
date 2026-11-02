import { BrandText } from "./BrandText";
import { journalDesign } from "@/lib/journalDesign";
export function JournalTitle({ title, slug }: { title: string; slug: string }) {
  const accent =
    journalDesign[slug]?.accent || title.split(" ").slice(-2).join(" ");
  const at = title.toLowerCase().indexOf(accent.toLowerCase());
  if (at < 0)
    return (
      <span className="accent">
        <BrandText text={title} linked />
      </span>
    );
  return (
    <>
      <BrandText text={title.slice(0, at)} linked />
      <span className="accent">
        <BrandText text={title.slice(at, at + accent.length)} linked />
      </span>
      <BrandText text={title.slice(at + accent.length)} linked />
    </>
  );
}
