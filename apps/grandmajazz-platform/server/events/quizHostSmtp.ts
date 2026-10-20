import nodemailer from 'nodemailer';

export class HostDeliveryUncertain extends Error {}

function transport() {
  const user = (process.env.QUIZ_HOST_SMTP_USER || '').trim();
  const pass = process.env.QUIZ_HOST_SMTP_PASSWORD || '';
  const port = Number(process.env.QUIZ_HOST_SMTP_PORT || 465);
  const host = process.env.QUIZ_HOST_SMTP_HOST || 'smtp.gmail.com';
  if (!/^[^\s<>@]+@grandmajazz\.com$/i.test(user) || !pass || ![465,587].includes(port) || !/^[a-z0-9.-]+$/i.test(host)) {
    throw new Error('The .com host mailbox connection is not configured');
  }
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

export async function sendQuizHostSmtp(row: { id: string; recipient: string; subject: string; html: string; text_body: string }) {
  const { user, client } = transport();
  if (!/^[a-z0-9_-]+$/i.test(row.id)) throw new Error('Invalid host message identifier');
  try {
    const result = await client.sendMail({
      from: { name: 'Grandma Jazz', address: user }, to: row.recipient, replyTo: user,
      envelope: { from: user, to: [row.recipient] },
      subject: row.subject, html: row.html, text: row.text_body,
      messageId: `<quiz-host-${row.id}@grandmajazz.com>`,
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
