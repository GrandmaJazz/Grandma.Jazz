ALTER TABLE "ev_registrations" ADD COLUMN IF NOT EXISTS "family_member_id" varchar;
--> statement-breakpoint
-- Reconcile only exact, unambiguous active Family email matches. Unmatched
-- legacy registrations are preserved unchanged for owner follow-up.
WITH matched AS (
 SELECT r.id AS registration_id, f.id AS family_id, trim(f.title) AS title, trim(f.name) AS name,
        dense_rank() OVER (PARTITION BY r.id ORDER BY f.created_at DESC NULLS LAST) AS rank
 FROM ev_registrations r JOIN ev_businesses b ON b.id=r.business_id AND b.slug='grandma-jazz'
 JOIN family_members f ON lower(trim(f.email))=r.email_normalized OR f.email=replace(encode(convert_to(r.email_normalized,'UTF8'),'base64'), chr(10),'')
 LEFT JOIN family_member_moderation mod ON mod.member_id=f.id
 WHERE r.family_member_id IS NULL AND mod.member_id IS NULL AND trim(f.title)<>'' AND trim(f.name)<>''
), resolved AS (
 SELECT registration_id,min(family_id) AS family_id
 FROM matched WHERE rank=1 GROUP BY registration_id
 HAVING count(DISTINCT (title,name))=1
)
UPDATE ev_registrations r SET family_member_id=resolved.family_id FROM resolved WHERE r.id=resolved.registration_id;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ev_registrations_confirmed_family_ux" ON "ev_registrations" ("event_id","family_member_id") WHERE status='confirmed' AND family_member_id IS NOT NULL;
