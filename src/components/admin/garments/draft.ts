import { blankPage, type GarmentsIssue } from "./issues";

export type PreparedPage = { job: string; index: number; image: string; thumbnail: string; title: string; alt: string; width: number; height: number; text?: string };

export function orderUploadBatch<T extends { name: string }>(files: T[]): T[] {
  return [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
}

export function previewDraft(pages: PreparedPage[], title: string, blankBack: boolean): GarmentsIssue {
  if (!pages.length || (!blankBack && pages.length < 2)) throw new Error("Add the cover pages first.");
  const faces = pages.map(p => ({ ...p, id: `${p.job}-${p.index}` }));
  return {
    id: "unpublished-preview", slug: "unpublished-preview", title: title.trim() || "Untitled issue",
    issueNumber: "", publicationDate: "", width: faces[0].width, height: faces[0].height,
    cover: faces[0], pages: faces.slice(1, blankBack ? undefined : -1),
    backCover: blankBack ? blankPage : faces[faces.length - 1],
  };
}
