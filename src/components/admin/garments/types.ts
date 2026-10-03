import type { GarmentsIssue } from './issues';
export type EditionState = 'draft' | 'published' | 'archived' | 'trash';
export type Edition = { id: string; slug: string; status: EditionState; version: number; document: GarmentsIssue; updatedAt: string; updatedBy: string | null; hasChanges: boolean; trashedAt: string | null };
export type Revision = { id: string; createdAt: string; publishedAt: string | null; title: string; author: string | null };
