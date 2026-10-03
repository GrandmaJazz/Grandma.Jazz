CREATE TABLE IF NOT EXISTS gj_garments_settings (id integer PRIMARY KEY CHECK (id=1), value jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS gj_garments_memberships (
 user_id uuid PRIMARY KEY REFERENCES ev_users(id), role text NOT NULL CHECK(role IN ('owner','editor')),
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','invited','revoked')), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS gj_garments_sessions (sid varchar PRIMARY KEY, sess json NOT NULL, expire timestamp NOT NULL);
CREATE INDEX IF NOT EXISTS gj_garments_sessions_expire ON gj_garments_sessions(expire);
CREATE TABLE IF NOT EXISTS gj_garments_tokens (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES ev_users(id), hash text NOT NULL UNIQUE,
 purpose text NOT NULL CHECK(purpose IN ('invite','reset')), expires_at timestamptz NOT NULL, used_at timestamptz
);
CREATE TABLE IF NOT EXISTS gj_garments_editions (
 id text PRIMARY KEY, slug text NOT NULL UNIQUE, status text NOT NULL CHECK(status IN ('draft','published','archived','trash')),
 version integer NOT NULL DEFAULT 1, draft_id uuid, published_id uuid,
 updated_by uuid REFERENCES ev_users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), trashed_at timestamptz
);
CREATE TABLE IF NOT EXISTS gj_garments_revisions (
 id uuid PRIMARY KEY, edition_id text NOT NULL REFERENCES gj_garments_editions(id) ON DELETE CASCADE,
 document jsonb NOT NULL, created_by uuid REFERENCES ev_users(id), created_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz
);
CREATE TABLE IF NOT EXISTS gj_garments_jobs (
 id uuid PRIMARY KEY, filename text NOT NULL, state text NOT NULL CHECK(state IN ('queued','converting','ready','error')),
 pages jsonb NOT NULL DEFAULT '[]', error text, attempts integer NOT NULL DEFAULT 0, created_by uuid REFERENCES ev_users(id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS gj_garments_assets (
 id uuid PRIMARY KEY, image text NOT NULL UNIQUE, thumbnail text, width integer NOT NULL, height integer NOT NULL,
 job_id uuid REFERENCES gj_garments_jobs(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS gj_garments_revision_assets (
 revision_id uuid NOT NULL REFERENCES gj_garments_revisions(id) ON DELETE CASCADE,
 asset_id uuid NOT NULL REFERENCES gj_garments_assets(id), PRIMARY KEY(revision_id,asset_id)
);
CREATE INDEX IF NOT EXISTS gj_garments_revision_assets_asset ON gj_garments_revision_assets(asset_id);
CREATE TABLE IF NOT EXISTS gj_garments_audit (
 id uuid PRIMARY KEY, actor_id uuid REFERENCES ev_users(id), edition_id text, action text NOT NULL,
 details jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
