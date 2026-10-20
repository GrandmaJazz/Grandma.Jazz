import { Router } from "express";
import { z } from "zod";
import { insertFamilyMemberSchema, type FamilyMember, type InsertFamilyMember } from "../shared/schema";
import {
  familyMarketingChoiceSchema, hasRecordedMarketingPermission,
  type FamilyMarketingChoice, type RecordedMarketingPermission,
} from "../shared/family-original/marketingChoice";
import type { AdmissionResult } from "./mailchimpAdmission";

export type FamilySignupStore = {
  findMemberByEmail(email: string): Promise<FamilyMember | null>;
  createMember(member: InsertFamilyMember): Promise<FamilyMember>;
};

type SignupDependencies = {
  storage: {
    findMemberByEmail(email: string): Promise<FamilyMember | null>;
    createMember(member: InsertFamilyMember): Promise<FamilyMember>;
    updateMailchimpStatus(memberId: string, added: boolean): Promise<void>;
  };
  withMemberEmailLock<T>(email: string, work: (members: FamilySignupStore) => Promise<T>): Promise<T>;
  recordChoice(memberId: string, choice: FamilyMarketingChoice): Promise<RecordedMarketingPermission | null>;
  admitSubscriber(email: string, title: string, name: string, permission: RecordedMarketingPermission): Promise<AdmissionResult>;
  welcomeEnabled(): boolean;
};

const memberSchema = insertFamilyMemberSchema.extend({ email: z.string().trim().email().transform(email => email.toLowerCase()) });
const emailSchema = z.string().trim().email().transform(email => email.toLowerCase());

export function familySignupRouter(dependencies: SignupDependencies) {
  const app = Router();

  // Returning-member lookup is read-only. It never retries an old welcome,
  // changes consent, updates a provider profile, or re-enrols an opt-out.
  app.post("/api/members/check-email", async (req, res) => {
    const email = emailSchema.safeParse(req.body?.email);
    if (!email.success) { res.status(400).json({ error: "A valid email is required" }); return; }
    try {
      const member = await dependencies.storage.findMemberByEmail(email.data);
      res.set("Cache-Control", "no-store");
      res.json(member ? {
        exists: true, emailSent: false, emailQueued: false,
        member: { id: member.id, title: member.title, name: member.name },
      } : { exists: false });
    } catch {
      res.status(500).json({ error: "Failed to check email" });
    }
  });

  app.post("/api/members", async (req, res) => {
    const validation = memberSchema.safeParse(req.body);
    const choice = familyMarketingChoiceSchema.safeParse(req.body);
    if (!validation.success) { res.status(400).json({ error: validation.error.message }); return; }
    if (!choice.success) { res.status(400).json({ error: "Please review the email updates choice." }); return; }
    try {
      // Also protect clients that skip the lookup or retry the POST. Existing
      // Family records keep their original identity and recorded choice.
      const selection = await dependencies.withMemberEmailLock(validation.data.email, async members => {
        const existing = await members.findMemberByEmail(validation.data.email);
        return existing
          ? { member: existing, created: false }
          : { member: await members.createMember(validation.data), created: true };
      });
      const member = selection.member;
      if (!selection.created) {
        res.set("Cache-Control", "no-store");
        res.json({ ...member, emailSent: false, emailQueued: false });
        return;
      }

      // Only the request that created the member may record its actual choice
      // and attempt admission. Provider calls never run inside the email lock.
      let permission: RecordedMarketingPermission | null = null;
      try { permission = await dependencies.recordChoice(member.id, choice.data); }
      catch { console.warn("[Family] Email updates held: permission evidence could not be saved."); }

      let emailQueued = false;
      let mailchimpAdded = false;
      if (permission && hasRecordedMarketingPermission(permission)) {
        const admission = await dependencies.admitSubscriber(validation.data.email, member.title, member.name, permission);
        if (admission.success) {
          mailchimpAdded = true;
          await dependencies.storage.updateMailchimpStatus(member.id, true);
          // This flag is enabled only after the provider welcome is verified
          // active. API admission establishes a trigger, never delivery.
          emailQueued = admission.created && dependencies.welcomeEnabled();
        }
      }

      // Declines, unknown permission and full capacity still receive their
      // on-screen brick. No independent email transport runs in this path.
      res.set("Cache-Control", "no-store");
      res.status(201).json({ ...member, mailchimpAdded, emailSent: false, emailQueued });
    } catch {
      res.status(500).json({ error: "Failed to create member" });
    }
  });
  return app;
}
