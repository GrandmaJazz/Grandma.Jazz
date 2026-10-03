import { Router } from "express";
import { pool } from "./db";
import { storage } from "./storage";
import { sendFamilyMessage } from "./email";
import { rateLimit } from "./events/security";

import { ensureFamilyModeration, removedFamilyMembers } from "./familyModeration";

export function familyManagementRouter() {
  const router = Router();
  router.get("/", async (_req, res, next) => {
    try {
      const data = await storage.getAdminMembers();
      const removed = await removedFamilyMembers();
      res.set("Cache-Control", "no-store");
      res.json({ source: data.source, emailConfigured: Boolean(process.env.RESEND_API_KEY),
        members: data.members.map(member => ({ ...member, removedAt: removed.get(member.id) || null })) });
    } catch (error) { next(error); }
  });
  router.post("/:id/:action", rateLimit("family-member-action", 20, 1 / 3), async (req, res, next) => {
    try {
      const { id, action } = req.params;
      if (!["remove", "restore", "email"].includes(action)) { res.status(404).json({ error: "Unknown member action" }); return; }
      const data = await storage.getAdminMembers();
      if (data.source !== "database") { res.status(503).json({ error: "Member changes require the live database. Please retry." }); return; }
      const member = data.members.find(member => member.id === id);
      if (!member) { res.status(404).json({ error: "Member not found" }); return; }
      await ensureFamilyModeration();
      if (action === "remove") {
        await pool.query("INSERT INTO family_member_moderation(member_id) VALUES ($1) ON CONFLICT DO NOTHING", [id]);
      } else if (action === "restore") {
        await pool.query("DELETE FROM family_member_moderation WHERE member_id=$1", [id]);
      } else {
        const subject = req.body?.subject, message = req.body?.message;
        if (typeof subject !== "string" || !subject.trim() || subject.length > 160 || /[\r\n]/.test(subject)
          || typeof message !== "string" || !message.trim() || message.length > 10000) {
          res.status(400).json({ error: "Enter a subject (up to 160 characters) and message (up to 10,000 characters)." }); return;
        }
        if (!member.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email)) {
          res.status(400).json({ error: "This member has no usable email address." }); return;
        }
        if (!process.env.RESEND_API_KEY) { res.status(503).json({ error: "Email delivery is not configured." }); return; }
        await sendFamilyMessage(member.email, subject.trim(), message.trim());
      }
      if (action !== "email") await storage.getAllMembers();
      res.json({ ok: true });
    } catch (error) { next(error); }
  });
  return router;
}
