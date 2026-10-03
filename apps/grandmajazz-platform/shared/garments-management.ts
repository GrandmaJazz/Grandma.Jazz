import { z } from "zod";
import { issueSchema, type GarmentsIssue } from "../client/src/garments/issues";

export const draftSchema = issueSchema.extend({ title: z.string().max(160), issueNumber: z.string().max(40), pages: issueSchema.shape.pages.max(78) });
export type EditionState = "draft" | "published" | "archived" | "trash";
export type Staff = { id: string; name: string; email: string; role: "owner" | "editor" };
export type Edition = { id: string; slug: string; status: EditionState; version: number; document: GarmentsIssue; updatedAt: string; updatedBy: string | null; hasChanges: boolean; trashedAt: string | null };
export type Revision = { id: string; createdAt: string; publishedAt: string | null; title: string; author: string | null };
export const editionActions = ["publish", "archive", "unpublish", "trash", "restore"] as const;
