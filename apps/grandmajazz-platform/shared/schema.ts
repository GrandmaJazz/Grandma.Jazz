import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const familyMembers = pgTable("family_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  mailchimpAdded: boolean("mailchimp_added").default(false),
  welcomeEmailSent: boolean("welcome_email_sent").default(false),
  followupScheduled: boolean("followup_scheduled").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFamilyMemberSchema = createInsertSchema(familyMembers).pick({
  title: true,
  name: true,
  email: true,
});

export type InsertFamilyMember = z.infer<typeof insertFamilyMemberSchema>;
export type FamilyMember = typeof familyMembers.$inferSelect;
