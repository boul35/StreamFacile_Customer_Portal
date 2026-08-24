const fs = require("fs");
const path = require("path");
const { pool } = require("../config/db");

async function ensureTracker() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function appliedFilenames() {
  const { rows } = await pool.query(`SELECT filename FROM schema_migrations`);
  return new Set(rows.map((r) => r.filename));
}

async function applyFile(file) {
  const sql = fs.readFileSync(path.join(__dirname, "..", "..", "db", "migrations", file), "utf8");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query(`INSERT INTO schema_migrations (filename) VALUES ($1)`, [file]);
    await client.query("COMMIT");
    console.log(`[migrate] appliqué: ${file}`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw new Error(`Échec de la migration ${file}: ${err.message}`);
  } finally {
    client.release();
  }
}

async function run() {
  await ensureTracker();

  const dir = path.join(__dirname, "..", "..", "db", "migrations");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const done = await appliedFilenames();
  const pending = files.filter((f) => !done.has(f));

  if (!pending.length) {
    console.log("[migrate] aucune migration en attente.");
    return;
  }

  for (const file of pending) {
    await applyFile(file);
  }

  console.log("[migrate] terminé.");
}

module.exports = { run };

if (require.main === module) {
  run().catch((err) => {
    console.error("[migrate]", err.message);
    process.exit(1);
  });
}
