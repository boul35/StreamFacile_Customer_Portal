const bcrypt = require("bcryptjs");
const { pool } = require("../config/db");
const env = require("../config/env");

async function seed() {
  const email = "demo@streamfacile.qc.ca";
  const { rows: existing } = await pool.query(
    `SELECT id FROM customers WHERE email = $1`,
    [email]
  );
  if (existing.length) {
    console.log("[seed] client de démonstration déjà présent.");
    return;
  }

  const hash = await bcrypt.hash("streamfacile123", 12);
  const { rows: plans } = await pool.query(
    `SELECT id FROM plans WHERE slug = 'populaire' LIMIT 1`
  );
  const planId = plans[0].id;

  const { rows } = await pool.query(
    `INSERT INTO customers (name, email, phone, password_hash, plan_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    ["Client Démo", email, "418 555-0101", hash, planId]
  );

  const customerId = rows[0].id;

  const { rows: channels } = await pool.query(
    `SELECT id FROM channels WHERE category IN ('Québec','Sports') ORDER BY id LIMIT 5`
  );
  for (const c of channels) {
    await pool.query(
      `INSERT INTO customer_channels (customer_id, channel_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [customerId, c.id]
    );
  }

  console.log("[seed] client de démonstration créé: demo@streamfacile.qc.ca / streamfacile123");
}

seed()
  .then(() => pool.end())
  .catch((err) => {
    console.error("[seed] échec:", err.message);
    process.exit(1);
  });
