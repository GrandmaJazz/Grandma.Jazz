// src/lib/applePass.ts
// Generates a signed Apple Wallet (.pkpass) event ticket.
//
// Required environment variables (all base64-encoded PEM, produced by
// scripts/prepare-apple-certs.sh):
//   APPLE_PASS_SIGNER_CERT   base64 of the Pass Type ID certificate (PEM)
//   APPLE_PASS_SIGNER_KEY    base64 of the matching private key (PEM, decrypted)
//   APPLE_WWDR               base64 of the Apple WWDR G4 intermediate cert (PEM)
// And identifiers (defaults match the uploaded pass.cer):
//   PASS_TYPE_IDENTIFIER     default: pass.store.grandmajazz.events
//   APPLE_TEAM_ID            default: PG9RLC7V6N

import { PKPass } from 'passkit-generator';
import { ICON_PNG_BASE64, LOGO_PNG_BASE64 } from '@/lib/passAssets';

export interface PassEvent {
  title: string;
  eventDate: string; // ISO or parseable date
  eventTime?: string; // e.g. "16:20" or "4:20 PM"
  location?: string;
}

export interface PassTicket {
  ticketNumber: string;
  attendeeName: string;
  event: PassEvent;
  quantity?: number;
}

const PASS_TYPE_IDENTIFIER =
  process.env.PASS_TYPE_IDENTIFIER || 'pass.store.grandmajazz.events';
const TEAM_ID = process.env.APPLE_TEAM_ID || 'PG9RLC7V6N';

// Grandma Jazz, Kamala (from site structured data)
const VENUE = { latitude: 7.9431224, longitude: 98.2781763 };

function pemFromEnv(name: string): Buffer {
  const b64 = process.env[name];
  if (!b64) throw new Error(`Missing environment variable ${name}`);
  return Buffer.from(b64, 'base64');
}

export function applePassConfigured(): boolean {
  return Boolean(
    process.env.APPLE_PASS_SIGNER_CERT &&
      process.env.APPLE_PASS_SIGNER_KEY &&
      process.env.APPLE_WWDR,
  );
}

function formatDateLabel(dateStr: string, timeStr?: string): string {
  try {
    const d = new Date(dateStr);
    const date = d.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return timeStr ? `${date} · ${timeStr}` : date;
  } catch {
    return dateStr;
  }
}

export async function generateEventTicketPass(ticket: PassTicket): Promise<Buffer> {
  const icon = Buffer.from(ICON_PNG_BASE64, 'base64');
  const logo = Buffer.from(LOGO_PNG_BASE64, 'base64');

  const relevantDate = (() => {
    const d = new Date(ticket.event.eventDate);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  })();

  const pass = new PKPass(
    {
      'icon.png': icon,
      'icon@2x.png': icon,
      'logo.png': logo,
      'logo@2x.png': logo,
    },
    {
      wwdr: pemFromEnv('APPLE_WWDR'),
      signerCert: pemFromEnv('APPLE_PASS_SIGNER_CERT'),
      signerKey: pemFromEnv('APPLE_PASS_SIGNER_KEY'),
    },
    {
      passTypeIdentifier: PASS_TYPE_IDENTIFIER,
      teamIdentifier: TEAM_ID,
      organizationName: 'Grandma Jazz',
      description: `Grandma Jazz — ${ticket.event.title}`,
      serialNumber: ticket.ticketNumber,
      foregroundColor: 'rgb(227, 220, 212)',
      backgroundColor: 'rgb(10, 10, 10)',
      labelColor: 'rgb(189, 170, 137)',
      ...(relevantDate ? { relevantDate } : {}),
      locations: [{ ...VENUE, relevantText: 'Welcome to Grandma Jazz' }],
    },
  );

  pass.type = 'eventTicket';

  pass.primaryFields.push({
    key: 'event',
    label: 'EVENT',
    value: ticket.event.title,
  });

  pass.secondaryFields.push(
    {
      key: 'name',
      label: 'GUEST',
      value: ticket.attendeeName,
    },
    {
      key: 'date',
      label: 'WHEN',
      value: formatDateLabel(ticket.event.eventDate, ticket.event.eventTime),
    },
  );

  pass.auxiliaryFields.push(
    {
      key: 'venue',
      label: 'WHERE',
      value: ticket.event.location || 'Grandma Jazz, Kamala, Phuket',
    },
    {
      key: 'ticket',
      label: 'TICKET',
      value: `#${ticket.ticketNumber}`,
    },
  );

  pass.setBarcodes({
    message: ticket.ticketNumber,
    format: 'PKBarcodeFormatQR',
    messageEncoding: 'iso-8859-1',
    altText: `#${ticket.ticketNumber}`,
  });

  return pass.getAsBuffer();
}
