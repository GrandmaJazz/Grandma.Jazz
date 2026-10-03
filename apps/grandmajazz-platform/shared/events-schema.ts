import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  boolean,
  timestamp,
  integer,
  jsonb,
  uuid,
  index,
  uniqueIndex,
  json,
} from "drizzle-orm/pg-core";

/**
 * Grandma Jazz Events platform schema.
 *
 * Kept separate from shared/schema.ts (legacy family wall) on purpose:
 * migrations for the events module are generated only from this file
 * (drizzle-events.config.ts) so the legacy table is never touched.
 *
 * All timestamps are timestamptz (UTC). Event display times use the
 * event's IANA timezone column.
 */

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

// ---------------------------------------------------------------- businesses
export const businesses = pgTable("ev_businesses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  instagramUrl: text("instagram_url"),
  websiteUrl: text("website_url"),
  // validated theme tokens only (colors/logo text), never raw CSS/JS
  theme: jsonb("theme").notNull().default(sql`'{}'::jsonb`),
  status: text("status", { enum: ["active", "inactive"] }).notNull().default("active"),
  defaultTimezone: text("default_timezone").notNull().default("Asia/Bangkok"),
  // data retention: months to keep attendee PII after an event completes (null = keep)
  retentionMonths: integer("retention_months"),
  ...timestamps,
}, (t) => [
  uniqueIndex("ev_businesses_slug_ux").on(t.slug),
]);

// --------------------------------------------------------------------- users
export const users = pgTable("ev_users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(), // stored normalized (trim+lowercase)
  name: text("name").notNull(),
  passwordHash: text("password_hash"), // null until invite accepted / password set
  isPlatformAdmin: boolean("is_platform_admin").notNull().default(false),
  status: text("status", { enum: ["invited", "active", "disabled"] }).notNull().default("invited"),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  // bump to invalidate all existing sessions for this user
  sessionEpoch: integer("session_epoch").notNull().default(0),
  ...timestamps,
}, (t) => [
  uniqueIndex("ev_users_email_ux").on(t.email),
]);

// -------------------------------------------------------- business_memberships
export const businessMemberships = pgTable("ev_business_memberships", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: uuid("business_id").notNull().references(() => businesses.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  role: text("role", { enum: ["business_owner", "event_manager", "checkin_staff"] }).notNull(),
  status: text("status", { enum: ["invited", "active", "revoked"] }).notNull().default("invited"),
  invitedByUserId: uuid("invited_by_user_id").references(() => users.id),
  ...timestamps,
}, (t) => [
  uniqueIndex("ev_memberships_business_user_ux").on(t.businessId, t.userId),
  index("ev_memberships_user_ix").on(t.userId),
]);

// ------------------------------------------------------------ one-time tokens
// invitations + password resets. Only the SHA-256 hash of the token is stored.
export const oneTimeTokens = pgTable("ev_one_time_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id),
  purpose: text("purpose", { enum: ["invite", "password_reset"] }).notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("ev_ott_token_hash_ux").on(t.tokenHash),
  index("ev_ott_user_ix").on(t.userId),
]);

// -------------------------------------------------------------------- venues
export const venues = pgTable("ev_venues", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: uuid("business_id").notNull().references(() => businesses.id),
  name: text("name").notNull(),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  region: text("region"),
  postalCode: text("postal_code"),
  country: text("country"),
  mapUrl: text("map_url"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  accessibilityNotes: text("accessibility_notes"),
  contactPhone: text("contact_phone"),
  ...timestamps,
}, (t) => [
  index("ev_venues_business_ix").on(t.businessId),
]);

// -------------------------------------------------------------------- events
export const EVENT_STATUSES = [
  "draft",
  "published",
  "registration_closed",
  "cancelled",
  "completed",
  "archived",
] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const events = pgTable("ev_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: uuid("business_id").notNull().references(() => businesses.id),
  venueId: uuid("venue_id").references(() => venues.id),
  title: text("title").notNull(),
  // globally unique across active events (single public namespace at /events/{slug});
  // enforced with a partial unique index in SQL (see migration) + app-level checks
  slug: text("slug").notNull(),
  subtitle: text("subtitle"),
  descriptionHtml: text("description_html").notNull().default(""), // sanitized server-side
  heroImagePath: text("hero_image_path"),
  heroImageAlt: text("hero_image_alt"),
  gallery: jsonb("gallery").notNull().default(sql`'[]'::jsonb`), // [{path, alt}]
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  timezone: text("timezone").notNull().default("Asia/Bangkok"),
  registrationOpensAt: timestamp("registration_opens_at", { withTimezone: true }),
  registrationClosesAt: timestamp("registration_closes_at", { withTimezone: true }),
  capacity: integer("capacity"), // null = unlimited
  showRemainingCapacity: boolean("show_remaining_capacity").notNull().default(true),
  dressCode: text("dress_code"),
  minAge: integer("min_age"),
  faqs: jsonb("faqs").notNull().default(sql`'[]'::jsonb`), // [{q, a}]
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  ogTitle: text("og_title"),
  ogDescription: text("og_description"),
  // latest broadcast to wallet-pass holders (rendered on the pass; change
  // triggers a lock-screen notification via the pass web service)
  passMessage: text("pass_message"),
  passMessageAt: timestamp("pass_message_at", { withTimezone: true }),
  // last rendered countdown label ("IN 5 DAYS"…); the refresh worker pushes
  // pass updates when this changes so the card art stays current
  passCountdownTag: text("pass_countdown_tag"),
  status: text("status", { enum: EVENT_STATUSES }).notNull().default("draft"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdByUserId: uuid("created_by_user_id").references(() => users.id),
  ...timestamps,
}, (t) => [
  index("ev_events_business_ix").on(t.businessId),
  index("ev_events_status_ix").on(t.status),
  index("ev_events_starts_ix").on(t.startsAt),
  index("ev_events_slug_ix").on(t.slug),
]);

// ------------------------------------------------------------- registrations
export const registrations = pgTable("ev_registrations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: uuid("business_id").notNull().references(() => businesses.id),
  eventId: uuid("event_id").notNull().references(() => events.id),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  emailNormalized: text("email_normalized").notNull(),
  phone: text("phone").notNull(),
  phoneNormalized: text("phone_normalized"),
  notes: text("notes"),
  termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }).notNull(),
  ageConfirmedAt: timestamp("age_confirmed_at", { withTimezone: true }),
  marketingConsent: boolean("marketing_consent").notNull().default(false),
  source: text("source", { enum: ["public", "manual"] }).notNull().default("public"),
  status: text("status", { enum: ["confirmed", "cancelled"] }).notNull().default("confirmed"),
  idempotencyKey: text("idempotency_key"),
  registeredAt: timestamp("registered_at", { withTimezone: true }).notNull().defaultNow(),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  cancelledReason: text("cancelled_reason"),
  createdByUserId: uuid("created_by_user_id").references(() => users.id), // staff, for manual adds
  ...timestamps,
}, (t) => [
  index("ev_registrations_event_ix").on(t.eventId),
  index("ev_registrations_business_ix").on(t.businessId),
  index("ev_registrations_email_ix").on(t.eventId, t.emailNormalized),
  // duplicate-confirmed prevention + idempotent retries: partial unique indexes in migration SQL
]);

// ------------------------------------------------------------------- tickets
export const tickets = pgTable("ev_tickets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: uuid("business_id").notNull().references(() => businesses.id),
  eventId: uuid("event_id").notNull().references(() => events.id),
  registrationId: uuid("registration_id").notNull().references(() => registrations.id),
  reference: text("reference").notNull(), // human-readable GJ-XXXX-XXXX (support, not auth)
  tokenHash: text("token_hash").notNull(), // SHA-256 of the opaque public token
  status: text("status", { enum: ["valid", "cancelled", "expired"] }).notNull().default("valid"),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  // set atomically on check-in; check_ins table holds the audit trail
  checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
  applePassSerial: text("apple_pass_serial"),
  googleObjectId: text("google_object_id"),
  lastDeliveredAt: timestamp("last_delivered_at", { withTimezone: true }),
  // bumped whenever the rendered pass content changes (check-in, message,
  // event edit); drives passesUpdatedSince + Last-Modified on the web service
  passUpdatedAt: timestamp("pass_updated_at", { withTimezone: true }).notNull().defaultNow(),
  ...timestamps,
}, (t) => [
  uniqueIndex("ev_tickets_registration_ux").on(t.registrationId),
  uniqueIndex("ev_tickets_reference_ux").on(t.reference),
  uniqueIndex("ev_tickets_token_hash_ux").on(t.tokenHash),
  index("ev_tickets_event_ix").on(t.eventId),
]);

// ----------------------------------------------------------------- check_ins
export const checkIns = pgTable("ev_check_ins", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: uuid("business_id").notNull().references(() => businesses.id),
  eventId: uuid("event_id").notNull().references(() => events.id),
  ticketId: uuid("ticket_id").notNull().references(() => tickets.id),
  staffUserId: uuid("staff_user_id").references(() => users.id),
  source: text("source", { enum: ["qr", "manual", "offline"] }).notNull().default("qr"),
  idempotencyKey: text("idempotency_key"),
  checkedInAt: timestamp("checked_in_at", { withTimezone: true }).notNull().defaultNow(),
  reversedAt: timestamp("reversed_at", { withTimezone: true }),
  reversedByUserId: uuid("reversed_by_user_id").references(() => users.id),
  reversalReason: text("reversal_reason"),
}, (t) => [
  index("ev_checkins_event_ix").on(t.eventId),
  index("ev_checkins_ticket_ix").on(t.ticketId),
]);

// -------------------------------------------------------------- email outbox
export const EMAIL_TEMPLATES = [
  "registration_confirmation",
  "ticket_resend",
  "event_reminder",
  "event_update",
  "event_cancellation",
  "registration_cancellation",
  "organizer_invitation",
  "password_reset",
] as const;
export type EmailTemplate = (typeof EMAIL_TEMPLATES)[number];

export const emailOutbox = pgTable("ev_email_outbox", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: uuid("business_id").references(() => businesses.id),
  eventId: uuid("event_id").references(() => events.id),
  registrationId: uuid("registration_id").references(() => registrations.id),
  ticketId: uuid("ticket_id").references(() => tickets.id),
  template: text("template", { enum: EMAIL_TEMPLATES }).notNull(),
  recipient: text("recipient").notNull(),
  subject: text("subject").notNull(),
  html: text("html").notNull(),
  textBody: text("text_body").notNull(),
  status: text("status", { enum: ["pending", "sending", "sent", "failed", "cancelled"] })
    .notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
  providerMessageId: text("provider_message_id"),
  lastError: text("last_error"), // redacted; never contains credentials
  dedupeKey: text("dedupe_key"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("ev_outbox_due_ix").on(t.status, t.nextAttemptAt),
  // dedupeKey uniqueness enforced with a partial unique index in migration SQL
]);

// ------------------------------------------------- wallet pass registrations
// Apple Wallet pass-update web service: one row per (device, pass). The push
// token lets us tell APNs "this pass changed"; the device then re-fetches it.
export const passRegistrations = pgTable("ev_pass_registrations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: uuid("ticket_id").notNull().references(() => tickets.id),
  passTypeId: text("pass_type_id").notNull(),
  deviceLibraryId: text("device_library_id").notNull(),
  pushToken: text("push_token").notNull(),
  ...timestamps,
}, (t) => [
  uniqueIndex("ev_pass_reg_device_ticket_ux").on(t.deviceLibraryId, t.ticketId),
  index("ev_pass_reg_ticket_ix").on(t.ticketId),
  index("ev_pass_reg_device_ix").on(t.deviceLibraryId),
]);

// ----------------------------------------------------------------- audit log
export const auditLog = pgTable("ev_audit_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: uuid("business_id").references(() => businesses.id),
  actorUserId: uuid("actor_user_id").references(() => users.id),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id"),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  requestId: text("request_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("ev_audit_business_ix").on(t.businessId, t.createdAt),
]);

// ----------------------------------------------------- session store (connect-pg-simple)
export const eventsSessions = pgTable("ev_sessions", {
  sid: varchar("sid").primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
}, (t) => [
  index("ev_sessions_expire_ix").on(t.expire),
]);

// ------------------------------------------------------------------- types
export type Business = typeof businesses.$inferSelect;
export type User = typeof users.$inferSelect;
export type BusinessMembership = typeof businessMemberships.$inferSelect;
export type Venue = typeof venues.$inferSelect;
export type EventRow = typeof events.$inferSelect;
export type Registration = typeof registrations.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type CheckIn = typeof checkIns.$inferSelect;
export type EmailOutboxRow = typeof emailOutbox.$inferSelect;
export type MembershipRole = BusinessMembership["role"];
