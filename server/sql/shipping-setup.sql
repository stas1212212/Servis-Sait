-- PULT+ | Nova Poshta manual logistics, stage 1.
-- Back up the service_shop database before running.
-- Apply AFTER customer-service-suite.sql; safe to re-run. No DROP / destructive updates.
BEGIN;

CREATE TABLE IF NOT EXISTS repair_shipments (
  id BIGSERIAL PRIMARY KEY,
  service_request_id INTEGER NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  direction VARCHAR(8) NOT NULL CHECK (direction IN ('incoming','outgoing')),
  carrier VARCHAR(20) NOT NULL DEFAULT 'nova_poshta' CHECK (carrier = 'nova_poshta'),
  tracking_number VARCHAR(14) CHECK (tracking_number IS NULL OR tracking_number ~ '^[0-9]{14}$'),
  status VARCHAR(20) NOT NULL DEFAULT 'not_sent'
    CHECK (status IN ('not_sent','registered','in_transit','at_branch','received','cancelled')),
  city VARCHAR(120) NOT NULL DEFAULT '',
  warehouse VARCHAR(180) NOT NULL DEFAULT '',
  -- Filled by staff for outbound shipments, never shown on public tracking-code endpoint.
  recipient_name VARCHAR(120) NOT NULL DEFAULT '',
  recipient_phone VARCHAR(30) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (service_request_id,direction)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_repair_shipments_ttn
  ON repair_shipments(tracking_number) WHERE tracking_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_repair_shipments_status
  ON repair_shipments(status,updated_at DESC);

CREATE TABLE IF NOT EXISTS repair_intakes (
  service_request_id INTEGER PRIMARY KEY REFERENCES service_requests(id) ON DELETE CASCADE,
  external_condition VARCHAR(1000) NOT NULL,
  accessories VARCHAR(1000) NOT NULL,
  serial_number VARCHAR(120) NOT NULL DEFAULT '',
  notes VARCHAR(1000) NOT NULL DEFAULT '',
  received_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Physical-person recipient details stay in an admin-only table.
-- Keep these separate from publicly exposed site_settings / Google Maps address.
CREATE TABLE IF NOT EXISTS shipping_recipient_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  full_name VARCHAR(120) NOT NULL DEFAULT '',
  phone VARCHAR(30) NOT NULL DEFAULT '',
  city VARCHAR(120) NOT NULL DEFAULT '',
  warehouse VARCHAR(180) NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO shipping_recipient_settings(id) VALUES(1)
ON CONFLICT(id) DO NOTHING;
-- Stage 1.1: confirmed, per-repair shipping instructions.
-- A private recipient is shown only to the logged-in owner of the repair
-- after an administrator explicitly approves this snapshot.
CREATE TABLE IF NOT EXISTS repair_send_instructions (
  service_request_id INTEGER PRIMARY KEY REFERENCES service_requests(id) ON DELETE CASCADE,
  recipient_name VARCHAR(120) NOT NULL,
  recipient_phone VARCHAR(30) NOT NULL,
  city VARCHAR(120) NOT NULL,
  warehouse VARCHAR(180) NOT NULL,
  approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
