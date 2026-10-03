import { familyManagementRouter } from "./familyManagement";
import { Router, type NextFunction, type Request, type Response } from "express";
import { createManagedGarments } from "./garmentsManagement";
import { GarmentsRepository } from "./garmentsRepository";
import { migrateGarments } from "./garmentsMigration";
import { pool } from "./db";
import path from "node:path";
import { readAdminKeyFile } from "./adminKey";
import { storage } from "./storage";
import type { AdminMember } from "./storage";
import { insertFamilyMemberSchema } from "@shared/schema";
import { initMailchimp, addSubscriberToList, decodeBase64Email, getMailchimpConnectionStatus } from "./mailchimp";
import { sendWelcomeEmail } from "./email";
import { renderBrickPng, renderEmailBrickPng, brickFilename } from "./brickImage";
import { verifyCurrentAdmin } from "./currentAdmin";

// --- /api/brick.png abuse guards -----------------------------------------
// PNG rendering is CPU-bound; protect the public endpoint with:
//   1. an LRU-ish cache keyed by `title|name` (cheap repeats),
//   2. a per-IP token bucket (burst 10, refill 1/sec),
//   3. a global concurrency cap (max N in-flight renders).
const BRICK_CACHE = new Map<string, Buffer>();
const BRICK_CACHE_MAX = 256;
function brickCacheGet(key: string): Buffer | undefined {
  const v = BRICK_CACHE.get(key);
  if (v) {
    BRICK_CACHE.delete(key);
    BRICK_CACHE.set(key, v); // refresh LRU
  }
  return v;
}
function brickCacheSet(key: string, buf: Buffer) {
  if (BRICK_CACHE.size >= BRICK_CACHE_MAX) {
    const firstKey = BRICK_CACHE.keys().next().value;
    if (firstKey !== undefined) BRICK_CACHE.delete(firstKey);
  }
  BRICK_CACHE.set(key, buf);
}

const BRICK_BUCKETS = new Map<string, { tokens: number; ts: number }>();
const BRICK_RATE = { burst: 10, refillPerSec: 1 };
function brickRateLimit(ip: string): boolean {
  const now = Date.now();
  const b = BRICK_BUCKETS.get(ip) ?? { tokens: BRICK_RATE.burst, ts: now };
  const elapsed = (now - b.ts) / 1000;
  b.tokens = Math.min(BRICK_RATE.burst, b.tokens + elapsed * BRICK_RATE.refillPerSec);
  b.ts = now;
  if (b.tokens < 1) {
    BRICK_BUCKETS.set(ip, b);
    return false;
  }
  b.tokens -= 1;
  BRICK_BUCKETS.set(ip, b);
  return true;
}
// Garbage-collect idle buckets every 5 min so the map can't grow unbounded.
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  BRICK_BUCKETS.forEach((b, ip) => { if (b.ts < cutoff) BRICK_BUCKETS.delete(ip); });
}, 5 * 60 * 1000).unref?.();

let BRICK_INFLIGHT = 0;
const BRICK_INFLIGHT_MAX = 4;

function getAdminToken(): string {
  const fileKey = readAdminKeyFile();
  if (fileKey !== undefined) return fileKey;
  return process.env.ADMIN_TOKEN || process.env.GRANDMAJAZZ_ADMIN_TOKEN || process.env.SESSION_SECRET || "";
}

function getRequestAdminToken(req: Request): string {
  const auth = req.headers.authorization || "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return String(req.headers["x-admin-key"] || req.query.adminKey || "").trim();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (/^Bearer\s+/i.test(req.headers.authorization || "")) {
    void verifyCurrentAdmin(req)
      .then((admin) => admin ? next() : res.status(403).json({ error: "Admin access required" }))
      .catch(next);
    return;
  }
  const expected = getAdminToken();
  if (!expected) {
    res.status(503).json({ error: "Admin token is not configured" });
    return;
  }

  if (getRequestAdminToken(req) !== expected) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}

function csvEscape(value: unknown): string {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function membersToCsv(members: AdminMember[]): string {
  const headers = [
    "id",
    "title",
    "name",
    "email",
    "mailchimp_added",
    "welcome_email_sent",
    "followup_scheduled",
    "created_at",
  ];
  const rows = members.map((member) => [
    member.id,
    member.title,
    member.name,
    member.email || "",
    member.mailchimpAdded ?? "",
    member.welcomeEmailSent ?? "",
    member.followupScheduled ?? "",
    member.createdAt || "",
  ]);

  return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n") + "\n";
}

function shouldDedupeEmails(req: Request): boolean {
  const value = String(req.query.dedupe || req.query.dedupeEmails || "").trim().toLowerCase();
  return value === "email" || value === "emails" || value === "true" || value === "1";
}

function dedupeMembersByEmail(members: AdminMember[]): AdminMember[] {
  const seen = new Set<string>();
  return members.filter((member) => {
    const email = member.email?.trim().toLowerCase();
    if (!email) return true;
    if (seen.has(email)) return false;
    seen.add(email);
    return true;
  });
}

function getMailchimpExportRows(members: AdminMember[]) {
  return members
    .filter((member) => Boolean(member.email))
    .map((member) => ({
      email: member.email!,
      name: member.name,
      familyName: `${member.title} ${member.name}`.trim(),
      familyPrefix: member.title,
    }));
}

function mailchimpRowsToCsv(members: AdminMember[]): string {
  const headers = ["email", "name", "family_name", "family_prefix"];
  const rows = getMailchimpExportRows(members).map((member) => [
    member.email,
    member.name,
    member.familyName,
    member.familyPrefix,
  ]);

  return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n") + "\n";
}

function mailchimpRowsToExcelHtml(members: AdminMember[]): string {
  const rows = getMailchimpExportRows(members);
  const escapeHtml = (value: string) => value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; }
    th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; }
    th { background: #111; color: #fff; }
  </style>
</head>
<body>
  <table>
    <thead>
      <tr><th>email</th><th>name</th><th>family_name</th><th>family_prefix</th></tr>
    </thead>
    <tbody>
      ${rows.map((row) => `<tr><td>${escapeHtml(row.email)}</td><td>${escapeHtml(row.name)}</td><td>${escapeHtml(row.familyName)}</td><td>${escapeHtml(row.familyPrefix)}</td></tr>`).join("\n")}
    </tbody>
  </table>
</body>
</html>`;
}

function escapePdfText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function mailchimpRowsToPdf(members: AdminMember[]): Buffer {
  const rows = getMailchimpExportRows(members);
  const lines = [
    "Grandma Jazz Mailchimp Export",
    `Generated: ${new Date().toISOString()}`,
    `Rows with email: ${rows.length}`,
    "",
    "email | name | family_name | family_prefix",
    ...rows.map((row) => `${row.email} | ${row.name} | ${row.familyName} | ${row.familyPrefix}`),
  ];

  const pageLines = 42;
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += pageLines) {
    pages.push(lines.slice(i, i + pageLines));
  }

  const objects: string[] = [];
  const addObject = (body: string) => {
    objects.push(body);
    return objects.length;
  };

  const fontObject = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageRefs: number[] = [];

  for (const page of pages.length ? pages : [[]]) {
    const streamLines = ["BT", "/F1 9 Tf", "40 780 Td"];
    page.forEach((line, index) => {
      if (index > 0) streamLines.push("0 -16 Td");
      streamLines.push(`(${escapePdfText(line.slice(0, 130))}) Tj`);
    });
    streamLines.push("ET");
    const stream = streamLines.join("\n");
    const contentObject = addObject(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
    const pageObject = addObject(`<< /Type /Page /Parent PAGES_REF 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontObject} 0 R >> >> /Contents ${contentObject} 0 R >>`);
    pageRefs.push(pageObject);
  }

  const pagesObject = addObject(`<< /Type /Pages /Kids [${pageRefs.map((ref) => `${ref} 0 R`).join(" ")}] /Count ${pageRefs.length} >>`);
  const catalogObject = addObject(`<< /Type /Catalog /Pages ${pagesObject} 0 R >>`);

  const resolvedObjects = objects.map((body) => body.replace(/PAGES_REF/g, String(pagesObject)));
  const chunks = ["%PDF-1.4\n"];
  const offsets = [0];
  resolvedObjects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(chunks.join("")));
    chunks.push(`${index + 1} 0 obj\n${body}\nendobj\n`);
  });
  const xrefOffset = Buffer.byteLength(chunks.join(""));
  chunks.push(`xref\n0 ${resolvedObjects.length + 1}\n`);
  chunks.push("0000000000 65535 f \n");
  for (let i = 1; i < offsets.length; i++) {
    chunks.push(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  }
  chunks.push(`trailer\n<< /Size ${resolvedObjects.length + 1} /Root ${catalogObject} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  return Buffer.from(chunks.join(""), "utf8");
}

function summarizeMembers(members: AdminMember[]) {
  const withEmail = members.filter((member) => Boolean(member.email)).length;
  const mailchimpAdded = members.filter((member) => member.mailchimpAdded === true).length;
  return {
    total: members.length,
    withEmail,
    withoutEmail: members.length - withEmail,
    mailchimpAdded,
    pendingMailchimp: Math.max(0, withEmail - mailchimpAdded),
  };
}

export async function registerRoutes(): Promise<Router> {
  initMailchimp();
  const app = Router();
  await migrateGarments(pool);
  const garments = await createManagedGarments(new GarmentsRepository(pool), {
    root: path.resolve("uploads/garments"), seed: path.resolve("client/public/garments/manifest.json"),
    secret: process.env.SESSION_SECRET!, origin: process.env.PUBLIC_URL || "https://www.grandmajazz.com",
    bootstrapKey: () => readAdminKeyFile(),
  });
  app.use(garments.router);
  const alwaysAllowedTestEmails = new Set(["bradfran@me.com"]);

  // Health check for NGINX / load balancers / PM2
  app.get("/api/healthz", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Server-side brick PNG export (for client download + email parity)
  // GET /api/brick.png?title=Uncle&name=Bob
  app.get("/api/brick.png", (req, res) => {
    const title = String(req.query.title || "").trim();
    const name = String(req.query.name || "").trim();
    const variant = req.query.variant === "email" ? "email" : "full";
    if (!title || !name) {
      res.status(400).json({ error: "title and name query params are required" });
      return;
    }
    if (title.length > 32 || name.length > 32) {
      res.status(400).json({ error: "title and name must be <= 32 chars" });
      return;
    }

    const ip = (req.headers["x-forwarded-for"] as string || "").split(",")[0].trim() || req.ip || "unknown";
    if (!brickRateLimit(ip)) {
      res.set("Retry-After", "10");
      res.status(429).json({ error: "Too many brick requests, slow down." });
      return;
    }

    const sendPng = (png: Buffer) => {
      res.set("Content-Type", "image/png");
      res.set("Content-Disposition", `attachment; filename="${brickFilename(title, name)}"`);
      res.set("Cache-Control", "public, max-age=86400");
      res.send(png);
    };

    const cacheKey = `${variant}|${title}|${name}`;
    const cached = brickCacheGet(cacheKey);
    if (cached) { sendPng(cached); return; }

    if (BRICK_INFLIGHT >= BRICK_INFLIGHT_MAX) {
      res.set("Retry-After", "2");
      res.status(503).json({ error: "Brick renderer busy, retry shortly." });
      return;
    }

    BRICK_INFLIGHT++;
    try {
      const png = variant === "email"
        ? renderEmailBrickPng(title, name)
        : renderBrickPng(title, name);
      brickCacheSet(cacheKey, png);
      sendPng(png);
    } catch (e: any) {
      console.error("[Routes] brick render failed:", e);
      res.status(500).json({ error: "Failed to render brick" });
    } finally {
      BRICK_INFLIGHT--;
    }
  });

  // Get all family members
  app.get("/api/members", async (_req, res) => {
    try {
      const members = await storage.getAllMembers();
      // Don't cache to always get fresh data
      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
      res.json(members);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch members" });
    }
  });

  app.use("/api/admin/members", requireAdmin, familyManagementRouter());

  app.get("/api/admin/status", requireAdmin, async (_req, res) => {
    const [{ source, members }, mailchimp] = await Promise.all([
      storage.getAdminMembers(),
      getMailchimpConnectionStatus(),
    ]);

    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    res.json({
      database: {
        source,
        live: source === "database",
      },
      members: summarizeMembers(members),
      mailchimp,
      syncing: {
        signupPushEnabled: true,
        bulkPushAvailable: members.some((member) => Boolean(member.email)),
      },
    });
  });

  app.post("/api/admin/mailchimp/push", requireAdmin, async (req, res) => {
    const onlyMissing = req.body?.onlyMissing !== false;
    const { source, members } = await storage.getAdminMembers();
    const candidates = members.filter((member) => {
      if (!member.email) return false;
      if (!onlyMissing) return true;
      return member.mailchimpAdded !== true;
    });

    const results = {
      source,
      requested: candidates.length,
      pushed: 0,
      failed: 0,
      skippedNoEmail: members.length - members.filter((member) => Boolean(member.email)).length,
      errors: [] as Array<{ id: string; name: string; error: string }>,
    };

    for (const member of candidates) {
      const response = await addSubscriberToList(member.email!, member.title, member.name);
      if (response.success) {
        results.pushed += 1;
        await storage.updateMailchimpStatus(member.id, true);
      } else {
        results.failed += 1;
        results.errors.push({
          id: member.id,
          name: member.name,
          error: response.error || "Unknown Mailchimp error",
        });
      }
    }

    res.json(results);
  });

  app.get("/api/admin/export.json", requireAdmin, async (_req, res) => {
    const payload = await storage.getAdminMembers();
    const dedupeEmails = shouldDedupeEmails(_req);
    const members = dedupeEmails ? dedupeMembersByEmail(payload.members) : payload.members;
    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    res.set("Content-Disposition", `attachment; filename="grandmajazz-members-${new Date().toISOString().slice(0, 10)}.json"`);
    res.json({
      exportedAt: new Date().toISOString(),
      source: payload.source,
      dedupe: dedupeEmails ? "email" : "none",
      members,
      summary: summarizeMembers(members),
    });
  });

  app.get("/api/admin/export.csv", requireAdmin, async (req, res) => {
    const { members } = await storage.getAdminMembers();
    const exportMembers = shouldDedupeEmails(req) ? dedupeMembersByEmail(members) : members;
    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    res.set("Content-Type", "text/csv; charset=utf-8");
    res.set("Content-Disposition", `attachment; filename="grandmajazz-members-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(membersToCsv(exportMembers));
  });

  app.get("/api/admin/mailchimp-export.csv", requireAdmin, async (req, res) => {
    const { members } = await storage.getAdminMembers();
    const exportMembers = shouldDedupeEmails(req) ? dedupeMembersByEmail(members) : members;
    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    res.set("Content-Type", "text/csv; charset=utf-8");
    res.set("Content-Disposition", `attachment; filename="grandmajazz-mailchimp-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(mailchimpRowsToCsv(exportMembers));
  });

  app.get("/api/admin/mailchimp-export.xls", requireAdmin, async (req, res) => {
    const { members } = await storage.getAdminMembers();
    const exportMembers = shouldDedupeEmails(req) ? dedupeMembersByEmail(members) : members;
    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    res.set("Content-Type", "application/vnd.ms-excel; charset=utf-8");
    res.set("Content-Disposition", `attachment; filename="grandmajazz-mailchimp-${new Date().toISOString().slice(0, 10)}.xls"`);
    res.send(mailchimpRowsToExcelHtml(exportMembers));
  });

  app.get("/api/admin/mailchimp-export.pdf", requireAdmin, async (req, res) => {
    const { members } = await storage.getAdminMembers();
    const exportMembers = shouldDedupeEmails(req) ? dedupeMembersByEmail(members) : members;
    const pdf = mailchimpRowsToPdf(exportMembers);
    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    res.set("Content-Type", "application/pdf");
    res.set("Content-Disposition", `attachment; filename="grandmajazz-mailchimp-${new Date().toISOString().slice(0, 10)}.pdf"`);
    res.send(pdf);
  });

  // Check if email already exists
  app.post("/api/members/check-email", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string") {
        res.status(400).json({ error: "Email is required" });
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      if (alwaysAllowedTestEmails.has(normalizedEmail)) {
        res.json({ exists: false, testEmailAllowed: true });
        return;
      }

      const existingMember = await storage.findMemberByEmail(normalizedEmail);
      if (existingMember) {
        let emailSent = false;
        let emailError = "";

        if (!existingMember.welcomeEmailSent) {
          const decodedEmail = decodeBase64Email(existingMember.email);
          try {
            console.log(`[Routes] Retrying welcome email to ${decodedEmail}`);
            const emailResult = await sendWelcomeEmail(
              decodedEmail,
              existingMember.title,
              existingMember.name
            );
            if (emailResult.success) {
              await storage.updateWelcomeEmailStatus(existingMember.id, true);
              emailSent = true;
            } else {
              emailError = emailResult.error || "Unknown error";
              console.error(
                `[Routes] Welcome email retry failed for ${existingMember.name}: ${emailError}`
              );
            }
          } catch (err: any) {
            emailError = err.message || "Failed to send email";
            console.error(`[Routes] Welcome email retry threw error: ${emailError}`);
          }
        }

        res.json({
          exists: true,
          emailSent,
          emailError,
          member: {
            id: existingMember.id,
            title: existingMember.title,
            name: existingMember.name
          }
        });
      } else {
        res.json({ exists: false });
      }
    } catch (error) {
      console.error("Failed to check email:", error);
      res.status(500).json({ error: "Failed to check email" });
    }
  });

  // Create a new family member
  app.post("/api/members", async (req, res) => {
    try {
      const validation = insertFamilyMemberSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ error: validation.error.message });
        return;
      }

      const member = await storage.createMember(validation.data);

      // Add to Mailchimp mailing list (decode base64 email first)
      const decodedEmail = decodeBase64Email(member.email);
      const mailchimpResult = await addSubscriberToList(
        decodedEmail,
        member.title,
        member.name
      );

      if (mailchimpResult.success) {
        await storage.updateMailchimpStatus(member.id, true);
        console.log(`Added ${member.name} to Mailchimp mailing list`);
      }

      // Send welcome email via Resend (brick image rendered server-side)
      let emailSent = false;
      let emailError = '';
      try {
        console.log(`[Routes] Sending welcome email to ${decodedEmail}`);
        const emailResult = await sendWelcomeEmail(decodedEmail, member.title, member.name);
        if (emailResult.success) {
          await storage.updateWelcomeEmailStatus(member.id, true);
          console.log(`[Routes] Welcome email sent to ${member.name}`);
          emailSent = true;
        } else {
          console.error(`[Routes] Welcome email failed for ${member.name}: ${emailResult.error}`);
          emailError = emailResult.error || 'Unknown error';
        }
      } catch (err: any) {
        console.error(`[Routes] Email sending threw error: ${err.message}`);
        emailError = err.message;
      }

      // Don't cache POST responses
      res.set("Cache-Control", "no-cache");
      res.status(201).json({ ...member, emailSent, emailError });
    } catch (error) {
      console.error("Failed to create member:", error);
      res.status(500).json({ error: "Failed to create member" });
    }
  });

  return app;
}
