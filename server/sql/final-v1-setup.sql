-- PULT+ v1.0 release completion migration. BACK UP service_shop before running.
-- Apply ONCE AFTER earlier migrations listed in FINAL-V1-CHECKLIST.md.
-- Repeatable and non-destructive: preserves all existing users, repairs, orders & stock.
BEGIN;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(120);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(30);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email VARCHAR(254);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(30);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_city VARCHAR(120);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_branch VARCHAR(180);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_comment VARCHAR(1000);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30) DEFAULT 'after_confirmation';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stock_restored BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_request_key VARCHAR(80);
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_client_request_key
  ON orders(client_request_key) WHERE client_request_key IS NOT NULL;

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_id INTEGER REFERENCES products(id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

CREATE TABLE IF NOT EXISTS order_status_history (
  id BIGSERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  old_status VARCHAR(30),
  new_status VARCHAR(30) NOT NULL,
  changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order
  ON order_status_history(order_id,changed_at,id);

-- Persistent Express sessions. DB credentials are server-only and never go to the browser.
CREATE TABLE IF NOT EXISTS pult_sessions (
  sid VARCHAR(255) PRIMARY KEY,
  sess JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pult_sessions_expires_at ON pult_sessions(expires_at);

-- Hash-keyed login/signup rate limits, shared between Node processes.
-- IP / email addresses are NOT stored in plaintext.
CREATE TABLE IF NOT EXISTS pult_auth_attempts (
  attempt_key CHAR(64) PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pult_auth_attempts_expires_at ON pult_auth_attempts(expires_at);


COMMIT;

-- Legacy purchases created before this migration have NULL order_items.product_id.
-- Do NOT infer a product from its display name automatically. Their cancelled stock
-- requires admin reconciliation. New v1 orders store product_id and are reversible.
-- Before resetting a production database or publishing, restore a backup in staging.
