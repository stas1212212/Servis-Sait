-- Run once in pgAdmin Query Tool for the service_shop database.
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';
CREATE INDEX IF NOT EXISTS idx_service_requests_user_id ON service_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_created_at ON service_requests(created_at);
-- To grant access, sign in with your own account, find its ID in users,
-- then run separately: UPDATE users SET role = 'admin' WHERE id = YOUR_ID;
