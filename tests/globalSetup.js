process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  "postgres://streamfacile:streamfacile@localhost:5432/streamfacile_test";

const { run: migrate } = require("../src/db/migrate");
const { seed } = require("../src/db/seed");
const { pool } = require("../src/config/db");

module.exports = async () => {
  await migrate();
  await seed();
  await pool.end();
};
