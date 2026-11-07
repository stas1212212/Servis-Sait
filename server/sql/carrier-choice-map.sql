-- PULT+ two-carrier repair logistics & exact map destinations.
-- BACK UP service_shop first. Apply after shipping-setup.sql; repeatable.
-- Does not delete or reset repairs, accounts, orders, stock, TTNs or approvals.
BEGIN;

-- Old repair_shipments constraint accepted only Nova Poshta.
ALTER TABLE repair_shipments DROP CONSTRAINT IF EXISTS repair_shipments_carrier_check;
ALTER TABLE repair_shipments ADD CONSTRAINT repair_shipments_carrier_check
  CHECK (carrier IN ('nova_poshta','ukrposhta'));

-- Nova Poshta usually uses 14 digits; Ukrposhta uses 13 characters.
ALTER TABLE repair_shipments DROP CONSTRAINT IF EXISTS repair_shipments_tracking_number_check;
ALTER TABLE repair_shipments ALTER COLUMN tracking_number TYPE VARCHAR(20);
ALTER TABLE repair_shipments ADD CONSTRAINT repair_shipments_tracking_number_check
  CHECK (tracking_number IS NULL OR
    (carrier='nova_poshta' AND tracking_number ~ '^[0-9]{14}$') OR
    (carrier='ukrposhta' AND tracking_number ~ '^[A-Za-z0-9]{13}$'));

CREATE TABLE IF NOT EXISTS shipping_carrier_locations (
  carrier VARCHAR(20) PRIMARY KEY CHECK(carrier IN ('nova_poshta','ukrposhta')),
  recipient_name VARCHAR(120) NOT NULL DEFAULT '',
  recipient_phone VARCHAR(30) NOT NULL DEFAULT '',
  city VARCHAR(120) NOT NULL DEFAULT '',
  warehouse VARCHAR(180) NOT NULL DEFAULT '',
  address VARCHAR(240) NOT NULL DEFAULT '',
  latitude NUMERIC(9,6) CHECK(latitude BETWEEN -90 AND 90),
  longitude NUMERIC(9,6) CHECK(longitude BETWEEN -180 AND 180),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((latitude IS NULL AND longitude IS NULL) OR
    (latitude IS NOT NULL AND longitude IS NOT NULL))
);
INSERT INTO shipping_carrier_locations(carrier) VALUES('nova_poshta'),('ukrposhta')
ON CONFLICT(carrier) DO NOTHING;

-- Migrate the prior PRIVATE Nova Poshta individual settings without publishing them.
UPDATE shipping_carrier_locations c SET
  recipient_name=s.full_name,
  recipient_phone=s.phone,
  city=s.city,
  warehouse=s.warehouse
FROM shipping_recipient_settings s
WHERE c.carrier='nova_poshta' AND s.id=1
 AND c.recipient_name='' AND c.recipient_phone='' AND c.city='' AND c.warehouse='';

-- A per-repair approved snapshot, not a global recipient visible by public RP code.
ALTER TABLE repair_send_instructions ADD COLUMN IF NOT EXISTS carrier VARCHAR(20) NOT NULL DEFAULT 'nova_poshta';
ALTER TABLE repair_send_instructions ADD COLUMN IF NOT EXISTS address VARCHAR(240) NOT NULL DEFAULT '';
ALTER TABLE repair_send_instructions ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6);
ALTER TABLE repair_send_instructions ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6);

-- A random, high-entropy guest capability to edit carrier selection after submitting
-- a guest repair; public RP code by itself does NOT authorize delivery edits.
CREATE TABLE IF NOT EXISTS repair_delivery_tokens (
  service_request_id INTEGER PRIMARY KEY REFERENCES service_requests(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;

-- IMPORTANT: edit the city, warehouse, street+building address and Google Maps
-- coordinates for EACH carrier on /admin-shipping.html. Nothing is invented here.
