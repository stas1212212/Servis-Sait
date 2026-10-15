-- PULT+ customer-service suite. Run in PostgreSQL 13+ AFTER existing schema scripts.
-- Safe to run repeatedly; existing repairs/orders are preserved.
BEGIN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS tracking_code VARCHAR(40);
UPDATE service_requests SET tracking_code = 'RP-' || UPPER(REPLACE(gen_random_uuid()::text, '-', '')) WHERE tracking_code IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_service_requests_tracking ON service_requests (tracking_code);
CREATE TABLE IF NOT EXISTS admin_notifications (
  id BIGSERIAL PRIMARY KEY,
  kind VARCHAR(24) NOT NULL CHECK(kind IN ('repair','order')),
  ref_id INTEGER NOT NULL,
  message VARCHAR(200) NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_admin_notifications_unread ON admin_notifications (is_read,created_at DESC);
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_password_resets_expiration ON password_reset_tokens (expires_at);
CREATE TABLE IF NOT EXISTS site_settings (
  key VARCHAR(40) PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO site_settings(key,value) VALUES
 ('phone',''),('telegram',''),('email',''),('address',''),('business_hours','')
 ON CONFLICT(key) DO NOTHING;
CREATE TABLE IF NOT EXISTS repair_reviews (
 id BIGSERIAL PRIMARY KEY,
 service_request_id INTEGER NOT NULL UNIQUE REFERENCES service_requests(id) ON DELETE CASCADE,
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
 comment VARCHAR(1200) NOT NULL CHECK (char_length(comment) BETWEEN 20 AND 1200),
 status VARCHAR(15) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 moderated_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_repair_reviews_published ON repair_reviews (status, created_at DESC);
COMMIT;
