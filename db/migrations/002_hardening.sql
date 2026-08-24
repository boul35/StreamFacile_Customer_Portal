-- ============================================================
-- StreamFacile — Migration 002 (renforcement)
-- - Suivi d'appareil déterministe via jeton unique
-- ============================================================

ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_token VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS uq_devices_customer_token
  ON devices (customer_id, device_token)
  WHERE device_token IS NOT NULL;
