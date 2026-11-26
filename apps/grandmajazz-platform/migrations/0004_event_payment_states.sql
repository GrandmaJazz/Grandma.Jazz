ALTER TABLE ev_events ADD COLUMN IF NOT EXISTS invite_only boolean NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS ticket_price_minor integer;
--> statement-breakpoint
ALTER TABLE ev_registrations ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'not_required', ADD COLUMN IF NOT EXISTS payment_amount_minor integer, ADD COLUMN IF NOT EXISTS payment_method text, ADD COLUMN IF NOT EXISTS payment_reference text, ADD COLUMN IF NOT EXISTS paid_at timestamptz;
--> statement-breakpoint
UPDATE ev_events SET invite_only=true,ticket_price_minor=200000 WHERE slug='ferry-christmas' AND business_id IN (SELECT id FROM ev_businesses WHERE slug='grandma-jazz');
--> statement-breakpoint
UPDATE ev_registrations r SET payment_status='reserved',payment_amount_minor=e.ticket_price_minor FROM ev_events e WHERE r.event_id=e.id AND e.slug='ferry-christmas' AND e.invite_only AND r.payment_status='not_required';
--> statement-breakpoint
UPDATE ev_tickets t SET status='payment_pending' FROM ev_registrations r WHERE t.registration_id=r.id AND r.payment_status='reserved' AND t.status='valid' AND t.checked_in_at IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS ev_confirmed_payment_reference_ux ON ev_registrations (business_id,payment_method,payment_reference) WHERE payment_status='confirmed' AND payment_reference IS NOT NULL;
