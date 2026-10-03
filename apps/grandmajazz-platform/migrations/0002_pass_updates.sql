CREATE TABLE "ev_pass_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"pass_type_id" text NOT NULL,
	"device_library_id" text NOT NULL,
	"push_token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ev_events" ADD COLUMN "pass_message" text;--> statement-breakpoint
ALTER TABLE "ev_events" ADD COLUMN "pass_message_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ev_events" ADD COLUMN "pass_countdown_tag" text;--> statement-breakpoint
ALTER TABLE "ev_tickets" ADD COLUMN "pass_updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "ev_pass_registrations" ADD CONSTRAINT "ev_pass_registrations_ticket_id_ev_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."ev_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ev_pass_reg_device_ticket_ux" ON "ev_pass_registrations" USING btree ("device_library_id","ticket_id");--> statement-breakpoint
CREATE INDEX "ev_pass_reg_ticket_ix" ON "ev_pass_registrations" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "ev_pass_reg_device_ix" ON "ev_pass_registrations" USING btree ("device_library_id");