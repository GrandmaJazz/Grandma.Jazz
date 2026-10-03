import { z } from "zod";

const assetUrl = z.string().refine(v => /^\/(?!\/)/.test(v) || /^https:\/\//.test(v), "Use a same-origin path or HTTPS URL");
const pageSchema = z.object({
  id: z.string().min(1), title: z.string(), image: assetUrl.optional(), alt: z.string().min(1),
  text: z.string().optional(), blank: z.boolean().optional(), thumbnail: assetUrl.optional(),
  blankColor: z.enum(["paper", "black"]).optional(), assetId: z.string().uuid().optional(),
  fixture: z.object({ color: z.string(), number: z.number(), photo: assetUrl.optional() }).optional(),
});
export const issueSchema = z.object({
  id: z.string().min(1), slug: z.string().regex(/^[a-z0-9-]+$/), title: z.string().min(1),
  issueNumber: z.string(), publicationDate: z.string(), width: z.number().positive(), height: z.number().positive(),
  cover: pageSchema, pages: z.array(pageSchema), backCover: pageSchema,
  blankColor: z.enum(["paper", "black"]).optional(),
  sourcePdf: assetUrl.optional(), enquiryUrl: z.string().url().refine(url => {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && ["instagram.com", "www.instagram.com"].includes(parsed.hostname);
  }).optional(), isDevelopmentFixture: z.boolean().optional(),
});
export type GarmentsPageAsset = z.infer<typeof pageSchema>;
export type GarmentsIssue = z.infer<typeof issueSchema>;
export type MasterPage = GarmentsPageAsset & {
  issueId: string; issueSlug: string; issueNumber: string; issueIndex: number;
  localPageIndex: number; localPageCount: number; globalPageIndex: number;
  pageType: "cover" | "content" | "closing";
};
export type MasterArchive = {
  issue: GarmentsIssue & { isMasterArchive: true };
  pages: MasterPage[];
  chapters: Array<{ issue: GarmentsIssue; startIndex: number; endIndex: number; pageCount: number }>;
};
export const manifestSchema = z.object({ logo: assetUrl.nullable(), enquiryUrl: issueSchema.shape.enquiryUrl, issues: z.array(issueSchema) });
export type GarmentsManifest = z.infer<typeof manifestSchema>;

export function parseManifest(input: unknown): GarmentsManifest {
  const result = manifestSchema.parse(input);
  const slugs = new Set<string>();
  for (const issue of result.issues) {
    if (slugs.has(issue.slug)) throw new Error("Duplicate issue slug");
    slugs.add(issue.slug);
    if (issue.isDevelopmentFixture || getLogicalPages(issue).some(p => p.fixture || (!p.blank && !p.image))) {
      throw new Error("Published issues require real page artwork");
    }
  }
  return result;
}
export const blankPage: GarmentsPageAsset = { id: "blank", title: "Blank page", alt: "Intentionally blank page", blank: true };
export function getLogicalPages(issue: GarmentsIssue): GarmentsPageAsset[] {
  if ((issue as GarmentsIssue & { isMasterArchive?: boolean }).isMasterArchive) return [issue.cover, ...issue.pages, issue.backCover];
  const pages = [issue.cover, ...issue.pages];
  // The back cover must be the reverse of the final sheet; pad BEFORE it.
  if (pages.length % 2 === 0) pages.push({ ...blankPage, blankColor: issue.blankColor || "paper" });
  return [...pages, issue.backCover];
}
export function buildMasterArchive(issues: GarmentsIssue[]): MasterArchive {
  const pages: MasterPage[] = [];
  const chapters = issues.map((issue, issueIndex) => {
    const local = getLogicalPages(issue);
    const startIndex = pages.length;
    local.forEach((page, localPageIndex) => pages.push({ ...page,
      issueId: issue.id, issueSlug: issue.slug, issueNumber: issue.issueNumber, issueIndex,
      localPageIndex, localPageCount: local.length, globalPageIndex: pages.length,
      pageType: localPageIndex === 0 ? "cover" : localPageIndex === local.length - 1 ? "closing" : "content",
    }));
    return { issue, startIndex, endIndex: pages.length - 1, pageCount: local.length };
  });
  const first = issues[0];
  const fallback = first || ({ id: "empty", slug: "empty", title: "Garments Archive", issueNumber: "", publicationDate: "", width: 1, height: 1, cover: blankPage, pages: [], backCover: blankPage } as GarmentsIssue);
  const master: GarmentsIssue & { isMasterArchive: true } = {
    ...fallback, id: "garments-master-archive", slug: "garments-master-archive", title: "Garments Master Archive",
    cover: pages[0] || fallback.cover, pages: pages.slice(1, -1), backCover: pages.at(-1) || fallback.backCover,
    isMasterArchive: true,
  };
  return { issue: master, pages, chapters };
}
export function getPhysicalSheets(issue: GarmentsIssue) {
  const pages = getLogicalPages(issue);
  return Array.from({ length: pages.length / 2 }, (_, sheetIndex) => ({
    sheetIndex, frontLogicalIndex: sheetIndex * 2, backLogicalIndex: sheetIndex * 2 + 1,
    front: pages[sheetIndex * 2], back: pages[sheetIndex * 2 + 1],
  }));
}
export function getSpread(issue: GarmentsIssue, turnedSheets: number) {
  const pages = getLogicalPages(issue);
  const k = Math.max(0, Math.min(pages.length / 2, Math.floor(turnedSheets)));
  return { leftIndex: k * 2 - 1, rightIndex: k * 2,
    left: pages[k * 2 - 1] ?? null, right: pages[k * 2] ?? null };
}
export const sheetCount = (issue: GarmentsIssue) => getLogicalPages(issue).length / 2;
export function readingPosition(logicalPage: number, count: number) {
  const page = Math.max(0, Math.min(count - 1, logicalPage));
  return { turned: Math.ceil(page / 2), focus: page % 2 ? "left" as const : "right" as const, page };
}
