const fs = require("fs");
const path = require("path");
const { pool } = require("../config/db");

async function run() {
  const dir = path.join(__dirname, "..", "..", "db", "migrations");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    console.log(`[migrate] exécution de ${file}`);
    await pool.query(sql);
  }

  console.log("[migrate] terminé.");
  await pool.end();
}

run().catch((err) => {
  console.error("[migrate] échec:", err.message);
  process.exit(1);
});
