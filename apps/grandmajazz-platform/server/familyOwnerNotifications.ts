import type { PoolClient } from "pg";
import type { FamilyMember } from "../shared/schema";
import { familyDisplayName, familyTileUrl } from "./familyEmailIdentity";
import { escapeHtml } from "./events/content";

export const FAMILY_OWNER_TEMPLATE = "family_owner_join";
export const FAMILY_OWNER_RECIPIENT = "grandma@grandmajazz.com";
export function familyOwnerAlertsEnabled() { return process.env.FAMILY_OWNER_EMAIL_MODE === "smtp"; }

export function renderFamilyOwnerJoin(member: Pick<FamilyMember, "title" | "name" | "createdAt">) {
  const name = familyDisplayName(member.title, member.name);
  const when = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" }).format(member.createdAt || new Date());
  const animatedLogo = "https://mcusercontent.com/a0ac9b0f4aca65e91620c65b9/images/b0c7d543-bf19-57d7-b70a-488f474813d6.gif";
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background-color:#000000;color:#eee7db;font-family:Roboto,Arial,Helvetica,sans-serif;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#000000" style="background-color:#000000;color:#eee7db;"><tr><td align="center" bgcolor="#000000" style="padding:28px 20px;background-color:#000000;color:#eee7db;font-family:Roboto,Arial,Helvetica,sans-serif;"><img src="${animatedLogo}" width="150" alt="Grandma Jazz" style="display:block;margin:0 auto;height:auto;border:0;"><h1 style="color:#eee7db;font-size:24px;font-weight:400;margin:28px 0;">Someone new has joined the Family</h1><img src="${escapeHtml(familyTileUrl(member.title, member.name))}" width="320" alt="${escapeHtml(name)}" style="display:block;margin:0 auto;width:320px;max-width:100%;height:auto;border:0;"><p style="margin:24px 0 12px;font-size:20px;color:#eee7db;">${escapeHtml(name)}</p><p style="color:#b49b73;">Joined ${escapeHtml(when)} Bangkok time</p><p style="margin-top:24px;"><a href="https://www.grandmajazz.com/admin/family" style="color:#b49b73;">Open the Family list</a></p><p style="color:#aaa;font-size:12px;">Owner notification only. This does not subscribe anyone to marketing.</p></td></tr></table></body></html>`;
  return { subject: `New Family member — ${name.slice(0,120)}`, html,
    text: `Someone new has joined the Grandma Jazz Family.\n\n${name}\nJoined ${when} Bangkok time\n\nhttps://www.grandmajazz.com/admin/family\n\nOwner notification only; marketing permission is separate.` };
}

/** Runs in the same transaction as a new member; no historical backfill. */
export async function enqueueFamilyOwnerJoin(client: Pick<PoolClient, "query">, member: Pick<FamilyMember, "id" | "title" | "name" | "createdAt">) {
  if (!familyOwnerAlertsEnabled()) return;
  const message = renderFamilyOwnerJoin(member);
  await client.query(`INSERT INTO ev_email_outbox (template,recipient,subject,html,text_body,dedupe_key)
    VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (dedupe_key) DO NOTHING`,
    [FAMILY_OWNER_TEMPLATE,FAMILY_OWNER_RECIPIENT,message.subject,message.html,message.text,`family-owner-join:${member.id}`]);
}
