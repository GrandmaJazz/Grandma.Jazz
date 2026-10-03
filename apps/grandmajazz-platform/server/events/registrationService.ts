import { randomUUID } from "node:crypto";
import { pool } from "../db";
import { generateTicketReference, normalizeEmail, normalizePhone, ticketToken, ticketTokenHash } from "./security";
import { enqueueRegistrationConfirmation } from "./emails";
import type { PoolClient } from "pg";

export type RegistrationInput = {
  eventId: string;
  fullName: string;
  email: string;
  phone: string;
  notes?: string;
  ageConfirmed?: boolean;
  termsAccepted: boolean;
  marketingConsent?: boolean;
  idempotencyKey?: string;
  source: "public" | "manual";
  createdByUserId?: string;
  /** manual adds by staff may bypass the registration window (never capacity) */
  overrideWindow?: boolean;
};

export type RegistrationResult =
  | { ok: true; registrationId: string; ticketId: string; ticketReference: string; ticketToken: string; duplicate: boolean }
  | { ok: false; code: "event_not_open" | "window_closed" | "window_not_open" | "full" | "duplicate_email" | "invalid"; message: string };

/**
 * Concurrency-safe registration. The event row is locked FOR UPDATE for the
 * capacity check + insert, so two competitors for the last place serialize and
 * exactly one succeeds. Retries with the same idempotency key return the
 * original registration (and the same deterministic ticket token).
 */
export async function registerAttendee(input: RegistrationInput): Promise<RegistrationResult> {
  const emailNorm = normalizeEmail(input.email);
  const phoneNorm = normalizePhone(input.phone);
  if (!input.fullName.trim() || !emailNorm.includes("@") || !input.phone.trim()) {
    return { ok: false, code: "invalid", message: "Name, email and phone are required" };
  }
  if (!input.termsAccepted) {
    return { ok: false, code: "invalid", message: "You must accept the event terms" };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Idempotent retry: same key on same event → return the existing result.
    if (input.idempotencyKey) {
      const existing = await findByIdempotency(client, input.eventId, input.idempotencyKey);
      if (existing) {
        await client.query("COMMIT");
        return existing;
      }
    }

    const { rows: [event] } = await client.query(
      `SELECT id, business_id, status, capacity, min_age,
              registration_opens_at, registration_closes_at, starts_at
         FROM ev_events WHERE id = $1 FOR UPDATE`,
      [input.eventId],
    );
    if (!event || event.status !== "published") {
      await client.query("ROLLBACK");
      return { ok: false, code: "event_not_open", message: "This event is not open for registration" };
    }
    const now = new Date();
    if (!input.overrideWindow) {
      if (event.registration_opens_at && now < event.registration_opens_at) {
        await client.query("ROLLBACK");
        return { ok: false, code: "window_not_open", message: "Registration has not opened yet" };
      }
      if (event.registration_closes_at && now > event.registration_closes_at) {
        await client.query("ROLLBACK");
        return { ok: false, code: "window_closed", message: "Registration has closed" };
      }
      if (now > event.starts_at) {
        await client.query("ROLLBACK");
        return { ok: false, code: "window_closed", message: "This event has already started" };
      }
    }
    if (event.min_age != null && input.source === "public" && !input.ageConfirmed) {
      await client.query("ROLLBACK");
      return { ok: false, code: "invalid", message: `You must confirm you are ${event.min_age} or older` };
    }

    if (event.capacity != null) {
      const { rows: [{ count }] } = await client.query(
        `SELECT count(*)::int AS count FROM ev_registrations WHERE event_id = $1 AND status = 'confirmed'`,
        [input.eventId],
      );
      if (count >= event.capacity) {
        await client.query("ROLLBACK");
        return { ok: false, code: "full", message: "This event is fully booked" };
      }
    }

    let registrationId: string;
    try {
      const { rows: [reg] } = await client.query(
        `INSERT INTO ev_registrations
           (business_id, event_id, full_name, email, email_normalized, phone, phone_normalized,
            notes, terms_accepted_at, age_confirmed_at, marketing_consent, source, status,
            idempotency_key, created_by_user_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now(),$9,$10,$11,'confirmed',$12,$13)
         RETURNING id`,
        [
          event.business_id, input.eventId, input.fullName.trim(), input.email.trim(), emailNorm,
          input.phone.trim(), phoneNorm, input.notes?.trim() || null,
          input.ageConfirmed ? new Date() : null, input.marketingConsent ?? false,
          input.source, input.idempotencyKey || null, input.createdByUserId || null,
        ],
      );
      registrationId = reg.id;
    } catch (err: any) {
      await client.query("ROLLBACK");
      if (err?.code === "23505" && String(err?.constraint || "").includes("confirmed_email")) {
        return {
          ok: false, code: "duplicate_email",
          message: "This email address is already registered for this event. Use the ticket link from your confirmation email, or ask us to resend it.",
        };
      }
      if (err?.code === "23505" && String(err?.constraint || "").includes("idempotency")) {
        // Raced against our own retry: re-read inside a fresh transaction.
        const client2 = await pool.connect();
        try {
          const existing = await findByIdempotency(client2, input.eventId, input.idempotencyKey!);
          if (existing) return existing;
        } finally {
          client2.release();
        }
      }
      throw err;
    }

    // Issue the ticket in the same transaction (registration+ticket are atomic).
    // The id is generated app-side because the token is HMAC(ticketId).
    let ticketId = "";
    let reference = "";
    for (let attempt = 0; attempt < 5; attempt++) {
      ticketId = randomUUID();
      reference = generateTicketReference();
      try {
        await client.query("SAVEPOINT ticket_insert");
        await client.query(
          `INSERT INTO ev_tickets (id, business_id, event_id, registration_id, reference, token_hash, status)
           VALUES ($1,$2,$3,$4,$5,$6,'valid')`,
          [ticketId, event.business_id, input.eventId, registrationId, reference, ticketTokenHash(ticketId)],
        );
        break;
      } catch (err: any) {
        // retry only on a (rare) human-reference collision
        if (err?.code === "23505" && String(err?.constraint || "").includes("reference") && attempt < 4) {
          await client.query("ROLLBACK TO SAVEPOINT ticket_insert");
          continue;
        }
        throw err;
      }
    }
    await client.query("COMMIT");

    // Confirmation email — enqueued idempotently outside the capacity lock.
    enqueueRegistrationConfirmation(registrationId).catch((err) =>
      console.error("[events] failed to enqueue confirmation email:", err),
    );

    return {
      ok: true,
      registrationId,
      ticketId,
      ticketReference: reference,
      ticketToken: ticketToken(ticketId),
      duplicate: false,
    };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

async function findByIdempotency(
  client: PoolClient,
  eventId: string,
  key: string,
): Promise<Extract<RegistrationResult, { ok: true }> | null> {
  const { rows: [row] } = await client.query(
    `SELECT r.id AS registration_id, t.id AS ticket_id, t.reference
       FROM ev_registrations r
       JOIN ev_tickets t ON t.registration_id = r.id
      WHERE r.event_id = $1 AND r.idempotency_key = $2`,
    [eventId, key],
  );
  if (!row) return null;
  return {
    ok: true,
    registrationId: row.registration_id,
    ticketId: row.ticket_id,
    ticketReference: row.reference,
    ticketToken: ticketToken(row.ticket_id),
    duplicate: true,
  };
}

/** Cancel a registration and invalidate its ticket atomically. */
export async function cancelRegistration(opts: {
  registrationId: string;
  businessId: string;
  reason?: string;
}): Promise<{ ok: boolean; eventId?: string }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: [reg] } = await client.query(
      `UPDATE ev_registrations
          SET status = 'cancelled', cancelled_at = now(), cancelled_reason = $3, updated_at = now()
        WHERE id = $1 AND business_id = $2 AND status = 'confirmed'
        RETURNING id, event_id`,
      [opts.registrationId, opts.businessId, opts.reason || null],
    );
    if (!reg) {
      await client.query("ROLLBACK");
      return { ok: false };
    }
    await client.query(
      `UPDATE ev_tickets SET status = 'cancelled', cancelled_at = now(), updated_at = now()
        WHERE registration_id = $1 AND status = 'valid'`,
      [opts.registrationId],
    );
    await client.query("COMMIT");
    return { ok: true, eventId: reg.event_id };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** Restore a cancelled registration if capacity permits (re-checked under lock). */
export async function restoreRegistration(opts: {
  registrationId: string;
  businessId: string;
}): Promise<{ ok: boolean; reason?: string }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: [reg] } = await client.query(
      `SELECT r.id, r.event_id, e.capacity, e.status AS event_status
         FROM ev_registrations r JOIN ev_events e ON e.id = r.event_id
        WHERE r.id = $1 AND r.business_id = $2 AND r.status = 'cancelled'
        FOR UPDATE OF e`,
      [opts.registrationId, opts.businessId],
    );
    if (!reg) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "Registration not found or not cancelled" };
    }
    if (["cancelled", "archived", "completed"].includes(reg.event_status)) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "Registrations cannot be restored for this event" };
    }
    if (reg.capacity != null) {
      const { rows: [{ count }] } = await client.query(
        `SELECT count(*)::int AS count FROM ev_registrations WHERE event_id = $1 AND status = 'confirmed'`,
        [reg.event_id],
      );
      if (count >= reg.capacity) {
        await client.query("ROLLBACK");
        return { ok: false, reason: "Event is at capacity" };
      }
    }
    await client.query(
      `UPDATE ev_registrations SET status = 'confirmed', cancelled_at = NULL, cancelled_reason = NULL, updated_at = now() WHERE id = $1`,
      [opts.registrationId],
    );
    await client.query(
      `UPDATE ev_tickets SET status = 'valid', cancelled_at = NULL, updated_at = now() WHERE registration_id = $1`,
      [opts.registrationId],
    );
    await client.query("COMMIT");
    return { ok: true };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
