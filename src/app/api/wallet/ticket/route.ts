// src/app/api/wallet/ticket/route.ts
// Returns a signed Apple Wallet .pkpass for a ticket.
// Ticket id is passed as a query param (?ticketId=...) rather than a dynamic
// path segment — a dynamic API route segment triggered a Vercel build bug
// (ENOENT export-detail.json), and a static route path avoids it entirely.
// The caller must forward the user's auth token (Bearer).

import { NextResponse } from 'next/server';
import {
  applePassConfigured,
  generateEventTicketPass,
  type PassTicket,
} from '@/lib/applePass';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ticketId = url.searchParams.get('ticketId');

  if (!ticketId) {
    return NextResponse.json({ error: 'Missing ticketId.' }, { status: 400 });
  }

  if (!applePassConfigured()) {
    return NextResponse.json(
      { error: 'Apple Wallet is not configured on the server yet.' },
      { status: 503 },
    );
  }

  // Forward the caller's auth token to the backend.
  const authHeader =
    request.headers.get('authorization') ||
    (() => {
      const t = url.searchParams.get('token');
      return t ? `Bearer ${t}` : '';
    })();

  if (!authHeader) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  // Fetch the ticket from the backend (also enforces ownership/authorization).
  let ticketData: any;
  try {
    const res = await fetch(`${API_URL}/api/tickets/${ticketId}`, {
      headers: { Authorization: authHeader },
      cache: 'no-store',
    });
    if (res.status === 401 || res.status === 403) {
      return NextResponse.json({ error: 'Not authorized for this ticket.' }, { status: 403 });
    }
    if (!res.ok) {
      return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 });
    }
    ticketData = await res.json();
  } catch (err) {
    console.error('[wallet] backend fetch failed', err);
    return NextResponse.json({ error: 'Unable to load ticket.' }, { status: 502 });
  }

  const ticket = ticketData?.ticket ?? ticketData;
  const event = ticket?.event ?? {};
  const attendee = Array.isArray(ticket?.attendees) ? ticket.attendees[0] : undefined;
  const attendeeName = attendee
    ? `${attendee.firstName ?? ''} ${attendee.lastName ?? ''}`.trim() || 'Guest'
    : 'Guest';

  if (!ticket?.ticketNumber || !event?.title) {
    return NextResponse.json({ error: 'Ticket is missing required fields.' }, { status: 422 });
  }

  if (ticket.status && !['paid', 'confirmed', 'active'].includes(ticket.status)) {
    return NextResponse.json(
      { error: `Ticket is not ready (status: ${ticket.status}).` },
      { status: 409 },
    );
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
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.pkpass',
        'Content-Disposition': `attachment; filename="grandmajazz-${passTicket.ticketNumber}.pkpass"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[wallet] pass generation failed', err);
    return NextResponse.json({ error: 'Could not generate the pass.' }, { status: 500 });
  }
}
