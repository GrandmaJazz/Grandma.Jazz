import { pool } from "../db";
import { sha256 } from "./security";
import { audit } from "./audit";

export type ScanResult =
  | { result: "checked_in"; ticket: ScanTicketInfo }
  | { result: "already_checked_in"; ticket: ScanTicketInfo; checkedInAt: string }
  | { result: "cancelled_ticket"; ticket: ScanTicketInfo }
  | { result: "expired_ticket"; ticket: ScanTicketInfo }
  | { result: "wrong_event"; eventTitle: string }
  | { result: "event_cancelled" }
  | { result: "unknown_ticket" };

export interface ScanTicketInfo {
  reference: string;
  attendeeName: string;
  eventTitle: string;
}

/**
 * Resolve a scanned QR value or manual reference and check the ticket in
 * atomically. Two devices scanning the same ticket concurrently produce one
 * "checked_in" and one "already_checked_in" — enforced by the conditional
 * UPDATE plus the partial unique index ev_checkins_active_ticket_ux.
 */
export async function scanTicket(opts: {
  businessId: string;
  eventId: string;
  /** raw QR content (ticket URL or token) OR human reference (GJ-....) */
  code: string;
  staffUserId: string;
  source: "qr" | "manual" | "offline";
  idempotencyKey?: string;
}): Promise<ScanResult> {
  const lookup = parseScanCode(opts.code);
  if (!lookup) return { result: "unknown_ticket" };

  const { rows: [ticket] } = await pool.query(
    `SELECT t.id, t.business_id, t.event_id, t.status, t.checked_in_at, t.reference,
            r.full_name, e.title AS event_title, e.status AS event_status, e.ends_at
       FROM ev_tickets t
       JOIN ev_registrations r ON r.id = t.registration_id
       JOIN ev_events e ON e.id = t.event_id
      WHERE ${lookup.column} = $1 AND t.business_id = $2`,
    [lookup.value, opts.businessId],
  );
  // Tenancy: tickets outside this business are indistinguishable from unknown.
  if (!ticket) return { result: "unknown_ticket" };

  const info: ScanTicketInfo = {
    reference: ticket.reference,
    attendeeName: ticket.full_name,
    eventTitle: ticket.event_title,
  };

  if (ticket.event_id !== opts.eventId) {
    return { result: "wrong_event", eventTitle: ticket.event_title };
  }
  if (ticket.event_status === "cancelled") return { result: "event_cancelled" };
  if (ticket.status === "cancelled") return { result: "cancelled_ticket", ticket: info };
  if (ticket.status === "expired") return { result: "expired_ticket", ticket: info };

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: [updated] } = await client.query(
      `UPDATE ev_tickets SET checked_in_at = now(), updated_at = now()
        WHERE id = $1 AND status = 'valid' AND checked_in_at IS NULL
        RETURNING checked_in_at`,
      [ticket.id],
    );
    if (!updated) {
      await client.query("ROLLBACK");
      const { rows: [current] } = await pool.query(
        `SELECT checked_in_at, status FROM ev_tickets WHERE id = $1`, [ticket.id],
      );
      if (current?.status === "cancelled") return { result: "cancelled_ticket", ticket: info };
      return {
        result: "already_checked_in",
        ticket: info,
        checkedInAt: current?.checked_in_at ? new Date(current.checked_in_at).toISOString() : "",
      };
    }
    try {
      await client.query(
        `INSERT INTO ev_check_ins (business_id, event_id, ticket_id, staff_user_id, source, idempotency_key)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [opts.businessId, opts.eventId, ticket.id, opts.staffUserId, opts.source, opts.idempotencyKey || null],
      );
    } catch (err: any) {
      if (err?.code === "23505") {
        // idempotent replay of the same scan
        await client.query("ROLLBACK");
        return { result: "checked_in", ticket: info };
      }
      throw err;
    }
    await client.query("COMMIT");
    // wallet pass flips to CHECKED IN on the attendee's phone (best-effort)
    void import("./wallet/passUpdates").then((m) => m.pushPassUpdates([ticket.id])).catch(() => {});
    return { result: "checked_in", ticket: info };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

function parseScanCode(code: string): { column: string; value: string } | null {
  const trimmed = code.trim();
  if (!trimmed) return null;
  // Human-readable reference (manual entry)
  if (/^GJ-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(trimmed)) {
    return { column: "t.reference", value: trimmed.toUpperCase() };
  }
  // Ticket URL from QR: .../events/t/{token}
  const urlMatch = trimmed.match(/\/events\/t\/([A-Za-z0-9_-]{20,})/);
  const token = urlMatch ? urlMatch[1] : (/^[A-Za-z0-9_-]{20,}$/.test(trimmed) ? trimmed : null);
  if (!token) return null;
  return { column: "t.token_hash", value: sha256(token) };
}

/** Reverse an accidental check-in. Requires event_manager+. Audit is preserved. */
export async function reverseCheckIn(opts: {
  businessId: string;
  ticketId: string;
  byUserId: string;
  reason: string;
}): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: [ticket] } = await client.query(
      `UPDATE ev_tickets SET checked_in_at = NULL, updated_at = now()
        WHERE id = $1 AND business_id = $2 AND checked_in_at IS NOT NULL
        RETURNING id, event_id`,
      [opts.ticketId, opts.businessId],
    );
    if (!ticket) {
      await client.query("ROLLBACK");
      return false;
    }
    await client.query(
      `UPDATE ev_check_ins SET reversed_at = now(), reversed_by_user_id = $2, reversal_reason = $3
        WHERE ticket_id = $1 AND reversed_at IS NULL`,
      [opts.ticketId, opts.byUserId, opts.reason],
    );
    await client.query("COMMIT");
    void import("./wallet/passUpdates").then((m) => m.pushPassUpdates([opts.ticketId])).catch(() => {});
    await audit({
      businessId: opts.businessId,
      actorUserId: opts.byUserId,
      action: "checkin.reverse",
      targetType: "ticket",
      targetId: opts.ticketId,
      metadata: { reason: opts.reason },
    });
    return true;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
