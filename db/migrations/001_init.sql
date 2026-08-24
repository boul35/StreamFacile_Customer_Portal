-- ============================================================
-- StreamFacile — Migration initiale (001_init.sql)
-- Créée par l'équipe StreamFacile. Exécuter avec: npm run migrate
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- Plans d'abonnement
-- Définit la limite de chaînes (max_channels) par forfait.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plans (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(80) NOT NULL,
  slug            VARCHAR(40) NOT NULL UNIQUE,
  max_channels    INTEGER NOT NULL DEFAULT 25 CHECK (max_channels >= 0),
  price_cad       NUMERIC(8, 2) NOT NULL DEFAULT 0,
  renewal_days    INTEGER NOT NULL DEFAULT 30,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO plans (name, slug, max_channels, price_cad, renewal_days)
VALUES
  ('Essentiel',   'essentiel',   25, 14.99, 30),
  ('Populaire',   'populaire',   75, 24.99, 30),
  ('Famille',     'famille',    150, 39.99, 30),
  ('Illimité',    'illimite', 10000, 59.99, 30)
ON CONFLICT (slug) DO NOTHING;

-- ------------------------------------------------------------
-- Clients (compte + profil + abonnement)
-- Le mot de passe est toujours stocké sous forme de hachage.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(120) NOT NULL,
  email           VARCHAR(160) NOT NULL UNIQUE,
  phone           VARCHAR(40),
  password_hash   VARCHAR(100) NOT NULL,
  plan_id         INTEGER NOT NULL REFERENCES plans(id),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  renewal_date    DATE NOT NULL DEFAULT (now() + interval '30 days'),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_email ON customers (email);

-- ------------------------------------------------------------
-- Catalogue de chaînes IPTV
-- external_id = identifiant Dispatcharr (ne jamais l'exposer
-- au client de manière sensible, utilisé côté serveur).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS channels (
  id              SERIAL PRIMARY KEY,
  external_id     VARCHAR(120) NOT NULL UNIQUE,
  name            VARCHAR(160) NOT NULL,
  category        VARCHAR(60) NOT NULL DEFAULT 'Autre',
  language        VARCHAR(20) NOT NULL DEFAULT 'fr',
  logo_url        TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_channels_category ON channels (category);
CREATE INDEX IF NOT EXISTS idx_channels_active ON channels (is_active);

INSERT INTO channels (external_id, name, category, language, logo_url)
VALUES
  ('qc-tva',    'TVA',            'Québec',    'fr', '/logos/tva.png'),
  ('qc-noovo',  'Noovo',          'Québec',    'fr', '/logos/noovo.png'),
  ('qc-radio',  'ICI Radio-Canada', 'Québec',  'fr', '/logos/radio-canada.png'),
  ('qc-teleq',  'Télé-Québec',    'Québec',    'fr', '/logos/telequebec.png'),
  ('ca-cbc',    'CBC',            'Canada',    'en', '/logos/cbc.png'),
  ('ca-ctv',    'CTV',            'Canada',    'en', '/logos/ctv.png'),
  ('ca-global', 'Global',         'Canada',    'en', '/logos/global.png'),
  ('sp-tsn',    'TSN',            'Sports',    'en', '/logos/tsn.png'),
  ('sp-rsn',    'RDS',            'Sports',    'fr', '/logos/rds.png'),
  ('sp-tva-sport', 'TVA Sports',  'Sports',    'fr', '/logos/tva-sports.png'),
  ('nv-ric',    'RDI',            'Nouvelles', 'fr', '/logos/rdi.png'),
  ('nv-cbn',    'CNN',            'Nouvelles', 'en', '/logos/cnn.png'),
  ('nv-bbc',    'BBC World',      'Nouvelles', 'en', '/logos/bbc.png'),
  ('en-disney', 'Disney',         'Enfants',   'en', '/logos/disney.png'),
  ('en-teletoon', 'Télétoon',     'Enfants',   'fr', '/logos/teletoon.png')
ON CONFLICT (external_id) DO NOTHING;

-- ------------------------------------------------------------
-- Sélection de chaînes par client
-- Enforce de la limite max_channels géré côté application,
-- mais on garde une contrainte d'intégrité.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customer_channels (
  customer_id     INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  channel_id      INTEGER NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  added_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, channel_id)
);

CREATE INDEX IF NOT EXISTS idx_cc_customer ON customer_channels (customer_id);

-- ------------------------------------------------------------
-- Appareils enregistrés (suivi des appareils)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS devices (
  id              SERIAL PRIMARY KEY,
  customer_id     INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  device_name     VARCHAR(120) NOT NULL,
  device_type     VARCHAR(40) NOT NULL DEFAULT 'Autre',
  platform        VARCHAR(80),
  app_version     VARCHAR(40),
  last_active_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_devices_customer ON devices (customer_id);

-- ------------------------------------------------------------
-- Tickets de support
-- context_json capture automatiquement le contexte technique
-- (appareil, profil client, chaîne concernée).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tickets (
  id              SERIAL PRIMARY KEY,
  reference       VARCHAR(20) NOT NULL UNIQUE,
  customer_id     INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  channel_id      INTEGER REFERENCES channels(id) ON DELETE SET NULL,
  device_id       INTEGER REFERENCES devices(id) ON DELETE SET NULL,
  subject         VARCHAR(160) NOT NULL,
  description     TEXT NOT NULL,
  context_json    JSONB NOT NULL DEFAULT '{}'::jsonb,
  status          VARCHAR(20) NOT NULL DEFAULT 'ouvert'
                  CHECK (status IN ('ouvert','en_cours','resolu','ferme')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tickets_customer ON tickets (customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets (status);

-- ------------------------------------------------------------
-- Travaux d'approvisionnement (provisioning) asynchrones
-- Stocke l'état des synchronisations vers Dispatcharr.
-- Aucune clé d'API n'est conservée ici.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS provisioning_jobs (
  id              SERIAL PRIMARY KEY,
  customer_id     INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  status          VARCHAR(20) NOT NULL DEFAULT 'en_attente'
                  CHECK (status IN ('en_attente','en_cours','reussi','echec')),
  selected_channels INTEGER NOT NULL DEFAULT 0,
  provider        VARCHAR(40) NOT NULL DEFAULT 'dispatcharr',
  result_json     JSONB,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_provjobs_customer ON provisioning_jobs (customer_id);

COMMIT;
