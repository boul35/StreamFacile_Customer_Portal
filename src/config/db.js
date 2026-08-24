const { Pool } = require("pg");
const env = require("./env");

const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on("error", (err) => {
  console.error("[db] erreur inattendue de connexion:", err.message);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params)
};
