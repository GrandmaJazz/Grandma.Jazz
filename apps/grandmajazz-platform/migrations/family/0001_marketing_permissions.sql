-- Additive Family migration; apply only with the approved release, before code.
-- Separate from the event migration journal. Existing consent remains unknown.
BEGIN;
CREATE TABLE IF NOT EXISTS family_marketing_permissions (
  member_id varchar PRIMARY KEY REFERENCES family_members(id),
  consented boolean NOT NULL,
  copy_version text NOT NULL,
  copy_text text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMIT;
