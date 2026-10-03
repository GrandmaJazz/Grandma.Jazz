CREATE TABLE "ev_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"request_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ev_business_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'invited' NOT NULL,
	"invited_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ev_businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"contact_email" text,
	"contact_phone" text,
	"instagram_url" text,
	"website_url" text,
	"theme" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"default_timezone" text DEFAULT 'Asia/Bangkok' NOT NULL,
	"retention_months" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ev_check_ins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"ticket_id" uuid NOT NULL,
	"staff_user_id" uuid,
	"source" text DEFAULT 'qr' NOT NULL,
	"idempotency_key" text,
	"checked_in_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reversed_at" timestamp with time zone,
	"reversed_by_user_id" uuid,
	"reversal_reason" text
);
--> statement-breakpoint
CREATE TABLE "ev_email_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid,
	"event_id" uuid,
	"registration_id" uuid,
	"ticket_id" uuid,
	"template" text NOT NULL,
	"recipient" text NOT NULL,
	"subject" text NOT NULL,
	"html" text NOT NULL,
	"text_body" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"provider_message_id" text,
	"last_error" text,
	"dedupe_key" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ev_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"venue_id" uuid,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"subtitle" text,
	"description_html" text DEFAULT '' NOT NULL,
	"hero_image_path" text,
	"hero_image_alt" text,
	"gallery" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"timezone" text DEFAULT 'Asia/Bangkok' NOT NULL,
	"registration_opens_at" timestamp with time zone,
	"registration_closes_at" timestamp with time zone,
	"capacity" integer,
	"show_remaining_capacity" boolean DEFAULT true NOT NULL,
	"dress_code" text,
	"min_age" integer,
	"faqs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"contact_email" text,
	"contact_phone" text,
	"og_title" text,
	"og_description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ev_sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" json NOT NULL,
	"expire" timestamp (6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ev_one_time_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ev_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"email_normalized" text NOT NULL,
	"phone" text NOT NULL,
	"phone_normalized" text,
	"notes" text,
	"terms_accepted_at" timestamp with time zone NOT NULL,
	"age_confirmed_at" timestamp with time zone,
	"marketing_consent" boolean DEFAULT false NOT NULL,
	"source" text DEFAULT 'public' NOT NULL,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"idempotency_key" text,
	"registered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_at" timestamp with time zone,
	"cancelled_reason" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ev_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"registration_id" uuid NOT NULL,
	"reference" text NOT NULL,
	"token_hash" text NOT NULL,
	"status" text DEFAULT 'valid' NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_at" timestamp with time zone,
	"checked_in_at" timestamp with time zone,
	"apple_pass_serial" text,
	"google_object_id" text,
	"last_delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ev_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text,
	"is_platform_admin" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'invited' NOT NULL,
	"email_verified_at" timestamp with time zone,
	"session_epoch" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ev_venues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"address_line1" text,
	"address_line2" text,
	"city" text,
	"region" text,
	"postal_code" text,
	"country" text,
	"map_url" text,
	"latitude" text,
	"longitude" text,
	"accessibility_notes" text,
	"contact_phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ev_audit_log" ADD CONSTRAINT "ev_audit_log_business_id_ev_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."ev_businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ev_audit_log" ADD CONSTRAINT "ev_audit_log_actor_user_id_ev_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."ev_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ev_business_memberships" ADD CONSTRAINT "ev_business_memberships_business_id_ev_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."ev_businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ev_business_memberships" ADD CONSTRAINT "ev_business_memberships_user_id_ev_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."ev_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ev_business_memberships" ADD CONSTRAINT "ev_business_memberships_invited_by_user_id_ev_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."ev_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ev_check_ins" ADD CONSTRAINT "ev_check_ins_business_id_ev_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."ev_businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ev_check_ins" ADD CONSTRAINT "ev_check_ins_event_id_ev_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."ev_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ev_check_ins" ADD CONSTRAINT "ev_check_ins_ticket_id_ev_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."ev_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ev_check_ins" ADD CONSTRAINT "ev_check_ins_staff_user_id_ev_users_id_fk" FOREIGN KEY ("staff_user_id") REFERENCES "public"."ev_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ev_check_ins" ADD CONSTRAINT "ev_check_ins_reversed_by_user_id_ev_users_id_fk" FOREIGN KEY ("reversed_by_user_id") REFERENCES "public"."ev_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ev_email_outbox" ADD CONSTRAINT "ev_email_outbox_business_id_ev_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."ev_businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ev_email_outbox" ADD CONSTRAINT "ev_email_outbox_event_id_ev_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."ev_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ev_email_outbox" ADD CONSTRAINT "ev_email_outbox_registration_id_ev_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."ev_registrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ev_email_outbox" ADD CONSTRAINT "ev_email_outbox_ticket_id_ev_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."ev_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ev_events" ADD CONSTRAINT "ev_events_business_id_ev_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."ev_businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ev_events" ADD CONSTRAINT "ev_events_venue_id_ev_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."ev_venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ev_events" ADD CONSTRAINT "ev_events_created_by_user_id_ev_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."ev_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ev_one_time_tokens" ADD CONSTRAINT "ev_one_time_tokens_user_id_ev_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."ev_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ev_registrations" ADD CONSTRAINT "ev_registrations_business_id_ev_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."ev_businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ev_registrations" ADD CONSTRAINT "ev_registrations_event_id_ev_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."ev_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ev_registrations" ADD CONSTRAINT "ev_registrations_created_by_user_id_ev_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."ev_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ev_tickets" ADD CONSTRAINT "ev_tickets_business_id_ev_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."ev_businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ev_tickets" ADD CONSTRAINT "ev_tickets_event_id_ev_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."ev_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ev_tickets" ADD CONSTRAINT "ev_tickets_registration_id_ev_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."ev_registrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ev_venues" ADD CONSTRAINT "ev_venues_business_id_ev_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."ev_businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ev_audit_business_ix" ON "ev_audit_log" USING btree ("business_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ev_memberships_business_user_ux" ON "ev_business_memberships" USING btree ("business_id","user_id");--> statement-breakpoint
CREATE INDEX "ev_memberships_user_ix" ON "ev_business_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ev_businesses_slug_ux" ON "ev_businesses" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "ev_checkins_event_ix" ON "ev_check_ins" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "ev_checkins_ticket_ix" ON "ev_check_ins" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "ev_outbox_due_ix" ON "ev_email_outbox" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "ev_events_business_ix" ON "ev_events" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "ev_events_status_ix" ON "ev_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ev_events_starts_ix" ON "ev_events" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "ev_events_slug_ix" ON "ev_events" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "ev_sessions_expire_ix" ON "ev_sessions" USING btree ("expire");--> statement-breakpoint
CREATE UNIQUE INDEX "ev_ott_token_hash_ux" ON "ev_one_time_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "ev_ott_user_ix" ON "ev_one_time_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ev_registrations_event_ix" ON "ev_registrations" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "ev_registrations_business_ix" ON "ev_registrations" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "ev_registrations_email_ix" ON "ev_registrations" USING btree ("event_id","email_normalized");--> statement-breakpoint
CREATE UNIQUE INDEX "ev_tickets_registration_ux" ON "ev_tickets" USING btree ("registration_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ev_tickets_reference_ux" ON "ev_tickets" USING btree ("reference");--> statement-breakpoint
CREATE UNIQUE INDEX "ev_tickets_token_hash_ux" ON "ev_tickets" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "ev_tickets_event_ix" ON "ev_tickets" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ev_users_email_ux" ON "ev_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "ev_venues_business_ix" ON "ev_venues" USING btree ("business_id");