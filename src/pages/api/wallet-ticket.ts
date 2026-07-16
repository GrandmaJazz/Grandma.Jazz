// src/pages/api/wallet-ticket.ts
// Returns a signed Apple Wallet .pkpass for a ticket (Pages Router API route).
// Ticket id via ?ticketId=. Caller forwards the user's auth token (Bearer).

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  applePassConfigured,
  generateEventTicketPass,
  type PassTicket,
} from '@/lib/applePass';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const config = {
  api: { responseLimit: false },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ticketId = (req.query.ticketId as string) || '';
  if (!ticketId) {
    return res.status(400).json({ error: 'Missing ticketId.' });
  }

  if (!applePassConfigured()) {
    return res.status(503).json({ error: 'Apple Wallet is not configured on the server yet.' });
  }

  const authHeader =
    req.headers.authorization ||
    (typeof req.query.token === 'string' ? `Bearer ${req.query.token}` : '');
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  let ticketData: any;
  try {
    const r = await fetch(`${API_URL}/api/tickets/${ticketId}`, {
      headers: { Authorization: authHeader },
      cache: 'no-store',
    });
    if (r.status === 401 || r.status === 403) {
      return res.status(403).json({ error: 'Not authorized for this ticket.' });
    }
    if (!r.ok) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }
    ticketData = await r.json();
  } catch (err) {
    console.error('[wallet] backend fetch failed', err);
    return res.status(502).json({ error: 'Unable to load ticket.' });
  }

  const ticket = ticketData?.ticket ?? ticketData;
  const event = ticket?.event ?? {};
  const attendee = Array.isArray(ticket?.attendees) ? ticket.attendees[0] : undefined;
  const attendeeName = attendee
    ? `${attendee.firstName ?? ''} ${attendee.lastName ?? ''}`.trim() || 'Guest'
    : 'Guest';

  if (!ticket?.ticketNumber || !event?.title) {
    return res.status(422).json({ error: 'Ticket is missing required fields.' });
  }

  if (ticket.status && !['paid', 'confirmed', 'active'].includes(ticket.status)) {
    return res.status(409).json({ error: `Ticket is not ready (status: ${ticket.status}).` });
  }

  const passTicket: PassTicket = {
    ticketNumber: String(ticket.ticketNumber),
    attendeeName,
    quantity: ticket.quantity,
    event: {
      title: event.title,
      eventDate: event.eventDate,
      eventTime: event.eventTime,
      location: event.location,
    },
  };

  try {
    const buffer = await generateEventTicketPass(passTicket);
    res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
    res.setHeader('Content-Disposition', `attachment; filename="grandmajazz-${passTicket.ticketNumber}.pkpass"`);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(buffer);
  } catch (err) {
    console.error('[wallet] pass generation failed', err);
    return res.status(500).json({ error: 'Could not generate the pass.' });
  }
}
