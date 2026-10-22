import nodemailer from 'nodemailer';

export class HostDeliveryUncertain extends Error {}

function transport(familyOwner = false) {
  const dedicated = familyOwner && Boolean(process.env.FAMILY_OWNER_SMTP_USER || process.env.FAMILY_OWNER_SMTP_PASSWORD);
  const prefix = dedicated ? "FAMILY_OWNER" : "QUIZ_HOST";
  const user = (process.env[`${prefix}_SMTP_USER`] || '').trim();
  const pass = process.env[`${prefix}_SMTP_PASSWORD`] || '';
  const port = Number(process.env[`${prefix}_SMTP_PORT`] || 465);
  const host = process.env[`${prefix}_SMTP_HOST`] || 'smtp.gmail.com';
  if (!/^[^\s<>@]+@grandmajazz\.com$/i.test(user) || !pass || ![465,587].includes(port) || !/^[a-z0-9.-]+$/i.test(host)) {
    throw new Error('The .com host mailbox connection is not configured');
  }
  if (dedicated && user.toLowerCase() !== 'grandma@grandmajazz.com') throw new Error('Family alerts require the Grandma mailbox');
  return { user, client: nodemailer.createTransport({
    host, port, secure: port === 465, requireTLS: true,
    auth: { user, pass }, tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000,
    disableFileAccess: true, disableUrlAccess: true, logger: false, debug: false,
  }) };
}

/** Authenticate without sending a message. Credentials never enter logs. */
export async function verifyQuizHostSmtp() {
  const { client } = transport();
  try { return await client.verify(); } finally { client.close(); }
}

type MailRow = { id: string; recipient: string; subject: string; html: string; text_body: string };

export async function verifyFamilyOwnerSmtp() {
  const { client } = transport(true);
  try { return await client.verify(); } finally { client.close(); }
}

export function sendQuizHostSmtp(row: MailRow) { return sendSmtp(row, false); }

export function sendFamilyOwnerSmtp(row: MailRow) {
  if (row.recipient.toLowerCase() !== "grandma@grandmajazz.com") throw new Error("Family owner recipient is fixed");
  return sendSmtp(row, true);
}

async function sendSmtp(row: MailRow, familyOwner: boolean) {
  const { user, client } = transport(familyOwner);
  if (!/^[a-z0-9_-]+$/i.test(row.id)) throw new Error('Invalid host message identifier');
  try {
    const result = await client.sendMail({
      from: { name: 'Grandma Jazz', address: user }, to: row.recipient, replyTo: user,
      envelope: { from: user, to: [row.recipient] },
      subject: row.subject, html: row.html, text: row.text_body,
      messageId: `<${familyOwner ? "family-owner" : "quiz-host"}-${row.id}@grandmajazz.com>`,
    });
    const accepted = result.accepted?.map(address => address.toLowerCase());
    if (!accepted?.includes(row.recipient.toLowerCase())) throw new Error('Host mailbox recipient was not accepted');
    return result.messageId;
  } catch (error: any) {
    const code = /^[A-Z0-9_]+$/.test(error?.code || '') ? error.code : 'SMTP_SEND_FAILED';
    const command = String(error?.command || '').toUpperCase();
    // No automatic resend after an uncertain DATA result: the server may have
    // accepted it already. Retain the stable Message-ID for manual reconciliation.
    if ((command === 'DATA' && !error?.responseCode) || error instanceof HostDeliveryUncertain) {
      throw new HostDeliveryUncertain('SMTP acceptance uncertain; inspect the host mailbox Sent folder before retrying');
    }
    throw new Error(`Host mailbox delivery failed (${code})`);
  } finally { client.close(); }
}
