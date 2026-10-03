import { pgTable, uuid, text, integer, jsonb, json, timestamp, varchar, primaryKey } from "drizzle-orm/pg-core";
import { users } from "./events-schema";
import type { GarmentsIssue } from "../client/src/garments/issues";

// Versioned SQL owns migrations; transaction-heavy publication queries use the shared pg pool.
export const garmentsSettings = pgTable("gj_garments_settings", { id: integer("id").primaryKey(), value: jsonb("value").notNull() });
export const garmentsMemberships = pgTable("gj_garments_memberships", {
  userId: uuid("user_id").primaryKey().references(() => users.id), role: text("role", { enum: ["owner", "editor"] }).notNull(),
  status: text("status", { enum: ["active", "invited", "revoked"] }).notNull().default("active"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const garmentsSessions = pgTable("gj_garments_sessions", { sid: varchar("sid").primaryKey(), sess: json("sess").notNull(), expire: timestamp("expire").notNull() });
export const garmentsTokens = pgTable("gj_garments_tokens", {
  id: uuid("id").primaryKey(), userId: uuid("user_id").notNull().references(() => users.id), hash: text("hash").notNull().unique(),
  purpose: text("purpose", { enum: ["invite", "reset"] }).notNull(), expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), usedAt: timestamp("used_at", { withTimezone: true }),
});
export const garmentsEditions = pgTable("gj_garments_editions", {
  id: text("id").primaryKey(), slug: text("slug").notNull().unique(), status: text("status", { enum: ["draft", "published", "archived", "trash"] }).notNull(),
  version: integer("version").notNull().default(1), draftId: uuid("draft_id"), publishedId: uuid("published_id"), updatedBy: uuid("updated_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(), trashedAt: timestamp("trashed_at", { withTimezone: true }),
});
export const garmentsRevisions = pgTable("gj_garments_revisions", {
  id: uuid("id").primaryKey(), editionId: text("edition_id").notNull().references(() => garmentsEditions.id, { onDelete: "cascade" }), document: jsonb("document").$type<GarmentsIssue>().notNull(),
  createdBy: uuid("created_by").references(() => users.id), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), publishedAt: timestamp("published_at", { withTimezone: true }),
});
export const garmentsJobs = pgTable("gj_garments_jobs", {
  id: uuid("id").primaryKey(), filename: text("filename").notNull(), state: text("state", { enum: ["queued", "converting", "ready", "error"] }).notNull(),
  pages: jsonb("pages").notNull().default([]), error: text("error"), attempts: integer("attempts").notNull().default(0), createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const garmentsAssets = pgTable("gj_garments_assets", {
  id: uuid("id").primaryKey(), image: text("image").notNull().unique(), thumbnail: text("thumbnail"), width: integer("width").notNull(), height: integer("height").notNull(),
  jobId: uuid("job_id").references(() => garmentsJobs.id, { onDelete: "cascade" }), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const garmentsRevisionAssets = pgTable("gj_garments_revision_assets", {
  revisionId: uuid("revision_id").notNull().references(() => garmentsRevisions.id, { onDelete: "cascade" }), assetId: uuid("asset_id").notNull().references(() => garmentsAssets.id),
}, t => [primaryKey({ columns: [t.revisionId, t.assetId] })]);
export const garmentsAudit = pgTable("gj_garments_audit", {
  id: uuid("id").primaryKey(), actorId: uuid("actor_id").references(() => users.id), editionId: text("edition_id"), action: text("action").notNull(), details: jsonb("details").notNull().default({}), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
