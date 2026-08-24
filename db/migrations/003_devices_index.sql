-- ============================================================
-- StreamFacile — Migration 003 (suivi d'appareil)
-- L'index unique partiel (WHERE device_token IS NOT NULL) n'est pas
-- reconnu par l'inférence ON CONFLICT de PostgreSQL. On le remplace
-- par un index unique simple : les NULL restent distincts, donc le
-- suivi par jeton fonctionne sans effet de bord.
-- ============================================================

DROP INDEX IF EXISTS uq_devices_customer_token;

CREATE UNIQUE INDEX IF NOT EXISTS uq_devices_customer_token
  ON devices (customer_id, device_token);
