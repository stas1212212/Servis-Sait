-- PULT+ | customer-only order history visibility (2026-11-04).
-- Run in pgAdmin Query Tool for service_shop AFTER taking a backup.
-- Safe to rerun. Does not delete orders, items, inventory or payment records.
BEGIN;
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_hidden_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_orders_customer_visible
  ON orders(user_id, created_at DESC)
  WHERE customer_hidden_at IS NULL;
COMMIT;
