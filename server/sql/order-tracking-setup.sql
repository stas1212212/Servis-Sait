ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_id INTEGER REFERENCES products(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stock_restored BOOLEAN NOT NULL DEFAULT FALSE;
CREATE TABLE IF NOT EXISTS order_status_history (id BIGSERIAL PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE, old_status VARCHAR(30), new_status VARCHAR(30) NOT NULL, changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL, changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS idx_order_history_order ON order_status_history(order_id, changed_at, id);
