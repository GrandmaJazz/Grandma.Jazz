-- Invariants that drizzle-kit cannot express declaratively.

-- One confirmed registration per (event, normalized email).
CREATE UNIQUE INDEX IF NOT EXISTS "ev_registrations_confirmed_email_ux"
  ON "ev_registrations" ("event_id", "email_normalized")
  WHERE "status" = 'confirmed';
--> statement-breakpoint

-- Idempotent registration retries: the same idempotency key on the same event
-- always maps to one registration row.
CREATE UNIQUE INDEX IF NOT EXISTS "ev_registrations_idempotency_ux"
  ON "ev_registrations" ("event_id", "idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;
--> statement-breakpoint

-- One non-archived event may hold a public slug at a time.
CREATE UNIQUE INDEX IF NOT EXISTS "ev_events_active_slug_ux"
  ON "ev_events" ("slug")
  WHERE "status" NOT IN ('archived');
--> statement-breakpoint

-- Email outbox dedupe (idempotent sends). Plain unique index: Postgres treats
-- NULLs as distinct, and ON CONFLICT (dedupe_key) can infer a full index.
CREATE UNIQUE INDEX IF NOT EXISTS "ev_outbox_dedupe_ux"
  ON "ev_email_outbox" ("dedupe_key");
--> statement-breakpoint

-- A ticket can have at most one non-reversed check-in.
CREATE UNIQUE INDEX IF NOT EXISTS "ev_checkins_active_ticket_ux"
  ON "ev_check_ins" ("ticket_id")
  WHERE "reversed_at" IS NULL;
--> statement-breakpoint

-- Check-in idempotency (offline sync replays map to the same row).
CREATE UNIQUE INDEX IF NOT EXISTS "ev_checkins_idempotency_ux"
  ON "ev_check_ins" ("ticket_id", "idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;
--> statement-breakpoint

-- Cross-table tenancy sanity: registrations/tickets must reference an event of
-- the same business. Enforced with composite FKs backed by a unique key.
ALTER TABLE "ev_events"
  ADD CONSTRAINT "ev_events_id_business_ux" UNIQUE ("id", "business_id");
--> statement-breakpoint
ALTER TABLE "ev_registrations"
  ADD CONSTRAINT "ev_registrations_event_business_fk"
  FOREIGN KEY ("event_id", "business_id")
  REFERENCES "ev_events" ("id", "business_id");
--> statement-breakpoint
ALTER TABLE "ev_tickets"
  ADD CONSTRAINT "ev_tickets_event_business_fk"
  FOREIGN KEY ("event_id", "business_id")
  REFERENCES "ev_events" ("id", "business_id");
--> statement-breakpoint

-- Capacity must be positive when set.
ALTER TABLE "ev_events"
  ADD CONSTRAINT "ev_events_capacity_positive_ck" CHECK ("capacity" IS NULL OR "capacity" > 0);
--> statement-breakpoint

-- End after start.
ALTER TABLE "ev_events"
  ADD CONSTRAINT "ev_events_time_order_ck" CHECK ("ends_at" > "starts_at");
