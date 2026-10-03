import { type FamilyMember, type InsertFamilyMember, familyMembers } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

export interface IStorage {
  getAllMembers(): Promise<[string, string, string][]>;
  getAdminMembers(): Promise<{ source: AdminMemberSource; members: AdminMember[] }>;
  createMember(member: InsertFamilyMember): Promise<FamilyMember>;
  findMemberByEmail(email: string): Promise<FamilyMember | null>;
  updateMailchimpStatus(memberId: string, added: boolean): Promise<void>;
  updateWelcomeEmailStatus(memberId: string, sent: boolean): Promise<void>;
}

export type AdminMemberSource = "database" | "full-cache" | "wall-cache";

export type AdminMember = {
  id: string;
  title: string;
  name: string;
  email: string | null;
  mailchimpAdded: boolean | null;
  welcomeEmailSent: boolean | null;
  followupScheduled: boolean | null;
  createdAt: string | null;
};

export class DatabaseStorage implements IStorage {
  async getAllMembers(): Promise<[string, string, string][]> {
    try {
      const results = await db
        .select({
          id: familyMembers.id,
          title: familyMembers.title,
          name: familyMembers.name,
        })
        .from(familyMembers)
        .orderBy(familyMembers.id);

      // Return as minified arrays [id, title, name]
      const members = results.map(m => [m.id, m.title, m.name] as [string, string, string]);
      await writeMembersCache(members);
      return members;
    } catch (error) {
      console.error("[Storage] Database getAllMembers failed; using cached members:", error);
      return readMembersCache();
    }
  }

  async getAdminMembers(): Promise<{ source: AdminMemberSource; members: AdminMember[] }> {
    try {
      const results = await db.select().from(familyMembers).orderBy(familyMembers.id);
      const members = results.map(toAdminMember);
      await writeFullMembersCache(members);
      await writeMembersCache(members.map((member) => [member.id, member.title, member.name]));
      return { source: "database", members };
    } catch (error) {
      console.error("[Storage] Database getAdminMembers failed; using cached export:", error);
      return readAdminMembersCache();
    }
  }

  async createMember(member: InsertFamilyMember): Promise<FamilyMember> {
    try {
      // Encode email to base64
      const encodedEmail = Buffer.from(member.email).toString("base64");
      const [result] = await db
        .insert(familyMembers)
        .values({
          ...member,
          email: encodedEmail,
        })
        .returning();
      await appendMemberCache([result.id, result.title, result.name]);
      await appendFullMemberCache(toAdminMember(result));
      return result;
    } catch (error) {
      console.error("[Storage] Database createMember failed; writing local fallback member:", error);
      const now = new Date();
      const fallbackMember: FamilyMember = {
        id: randomUUID(),
        title: member.title,
        name: member.name,
        email: Buffer.from(member.email).toString("base64"),
        mailchimpAdded: false,
        welcomeEmailSent: false,
        followupScheduled: false,
        createdAt: now,
      };
      await appendMemberCache([fallbackMember.id, fallbackMember.title, fallbackMember.name]);
      await appendFullMemberCache(toAdminMember(fallbackMember));
      return fallbackMember;
    }
  }

  async findMemberByEmail(email: string): Promise<FamilyMember | null> {
    try {
      // Encode email to base64 to match stored format
      const encodedEmail = Buffer.from(email).toString("base64");
      const results = await db
        .select()
        .from(familyMembers)
        .where(eq(familyMembers.email, encodedEmail))
        .limit(1);
      return results[0] || null;
    } catch (error) {
      console.error("[Storage] Database findMemberByEmail failed; allowing local fallback signup:", error);
      return null;
    }
  }

  async updateMailchimpStatus(memberId: string, added: boolean): Promise<void> {
    try {
      await db
        .update(familyMembers)
        .set({ mailchimpAdded: added })
        .where(eq(familyMembers.id, memberId));
    } catch (error) {
      console.error(`[Storage] Database updateMailchimpStatus failed for ${memberId}:`, error);
      await updateFullMemberCache(memberId, { mailchimpAdded: added });
    }
  }

  async updateWelcomeEmailStatus(memberId: string, sent: boolean): Promise<void> {
    try {
      await db
        .update(familyMembers)
        .set({ welcomeEmailSent: sent })
        .where(eq(familyMembers.id, memberId));
    } catch (error) {
      console.error(`[Storage] Database updateWelcomeEmailStatus failed for ${memberId}:`, error);
      await updateFullMemberCache(memberId, { welcomeEmailSent: sent });
    }
  }
}

export const storage = new DatabaseStorage();

const cacheDir = process.env.MEMBER_CACHE_DIR || path.join(process.cwd(), "data");
const membersCacheFile = path.join(cacheDir, "members-cache.json");
const fullMembersCacheFile = path.join(cacheDir, "members-full-cache.json");

async function writeMembersCache(members: [string, string, string][]) {
  await mkdir(cacheDir, { recursive: true });
  await writeFile(membersCacheFile, JSON.stringify(members), "utf8");
}

async function appendMemberCache(member: [string, string, string]) {
  const members: [string, string, string][] = await readMembersCache().catch(() => []);
  if (!members.some(([id]) => id === member[0])) {
    members.push(member);
  }
  await writeMembersCache(members);
}

async function writeFullMembersCache(members: AdminMember[]) {
  await mkdir(cacheDir, { recursive: true });
  await writeFile(fullMembersCacheFile, JSON.stringify(members), "utf8");
}

async function appendFullMemberCache(member: AdminMember) {
  const current: AdminMember[] = await readFullMembersCache().catch(() => []);
  const existingIndex = current.findIndex((item) => item.id === member.id);
  if (existingIndex >= 0) {
    current[existingIndex] = member;
  } else {
    current.push(member);
  }
  await writeFullMembersCache(current);
}

async function updateFullMemberCache(memberId: string, patch: Partial<AdminMember>) {
  const current: AdminMember[] = await readFullMembersCache().catch(() => []);
  const existingIndex = current.findIndex((item) => item.id === memberId);
  if (existingIndex < 0) return;
  current[existingIndex] = {
    ...current[existingIndex],
    ...patch,
  };
  await writeFullMembersCache(current);
}

async function readAdminMembersCache(): Promise<{ source: AdminMemberSource; members: AdminMember[] }> {
  const full = await readFullMembersCache().catch(() => null);
  if (full && full.length > 0) {
    return { source: "full-cache", members: full };
  }

  const wallMembers = await readMembersCache();
  return {
    source: "wall-cache",
    members: wallMembers.map(([id, title, name]) => ({
      id,
      title,
      name,
      email: null,
      mailchimpAdded: null,
      welcomeEmailSent: null,
      followupScheduled: null,
      createdAt: null,
    })),
  };
}

async function readFullMembersCache(): Promise<AdminMember[]> {
  const cached = JSON.parse(await readFile(fullMembersCacheFile, "utf8"));
  return validateAdminMembers(cached);
}

async function readMembersCache(): Promise<[string, string, string][]> {
  try {
    const cached = JSON.parse(await readFile(membersCacheFile, "utf8"));
    return validateMembers(cached);
  } catch {
    const fromLogs = await readMembersFromPm2Logs();
    await writeMembersCache(fromLogs);
    return fromLogs;
  }
}

async function readMembersFromPm2Logs(): Promise<[string, string, string][]> {
  const logDir = "/root/.pm2/logs";
  const files = (await readdir(logDir))
    .filter((file) => /^grandmajazz-out.*\.log$/.test(file))
    .map((file) => path.join(logDir, file));

  let latest: [string, string, string][] | null = null;
  for (const file of files) {
    const text = await readFile(file, "utf8");
    const matches = Array.from(text.matchAll(/GET \/api\/members 200[^\n]* :: (\[.*\])/g));
    if (matches.length === 0) continue;
    latest = validateMembers(JSON.parse(matches[matches.length - 1][1]));
  }

  if (!latest) {
    throw new Error("No cached member list available");
  }
  return latest;
}

function toAdminMember(member: FamilyMember): AdminMember {
  return {
    id: member.id,
    title: member.title,
    name: member.name,
    email: safeDecodeEmail(member.email),
    mailchimpAdded: member.mailchimpAdded ?? false,
    welcomeEmailSent: member.welcomeEmailSent ?? false,
    followupScheduled: member.followupScheduled ?? false,
    createdAt: member.createdAt ? new Date(member.createdAt).toISOString() : null,
  };
}

function safeDecodeEmail(email: string): string {
  try {
    return Buffer.from(email, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

function validateAdminMembers(value: unknown): AdminMember[] {
  if (!Array.isArray(value)) {
    throw new Error("Invalid full members cache");
  }

  return value.map((member) => {
    if (
      !member ||
      typeof member !== "object" ||
      typeof (member as AdminMember).id !== "string" ||
      typeof (member as AdminMember).title !== "string" ||
      typeof (member as AdminMember).name !== "string"
    ) {
      throw new Error("Invalid full members cache entry");
    }

    const entry = member as AdminMember;
    return {
      id: entry.id,
      title: entry.title,
      name: entry.name,
      email: typeof entry.email === "string" && entry.email ? entry.email : null,
      mailchimpAdded: typeof entry.mailchimpAdded === "boolean" ? entry.mailchimpAdded : null,
      welcomeEmailSent: typeof entry.welcomeEmailSent === "boolean" ? entry.welcomeEmailSent : null,
      followupScheduled: typeof entry.followupScheduled === "boolean" ? entry.followupScheduled : null,
      createdAt: typeof entry.createdAt === "string" && entry.createdAt ? entry.createdAt : null,
    };
  });
}

function validateMembers(value: unknown): [string, string, string][] {
  if (!Array.isArray(value)) {
    throw new Error("Invalid members cache");
  }
  return value.map((member) => {
    if (
      !Array.isArray(member) ||
      member.length < 3 ||
      typeof member[0] !== "string" ||
      typeof member[1] !== "string" ||
      typeof member[2] !== "string"
    ) {
      throw new Error("Invalid members cache entry");
    }
    return [member[0], member[1], member[2]];
  });
}
