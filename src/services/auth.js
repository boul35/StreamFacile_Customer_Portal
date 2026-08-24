const bcrypt = require("bcryptjs");
const { pool } = require("../config/db");
const env = require("../config/env");

const SALT_ROUNDS = 12;

async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

async function findByEmail(email) {
  const { rows } = await pool.query(
    `SELECT c.*, p.name AS plan_name, p.max_channels, p.slug AS plan_slug
       FROM customers c
       JOIN plans p ON p.id = c.plan_id
      WHERE c.email = $1`,
    [email.toLowerCase()]
  );
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT c.*, p.name AS plan_name, p.max_channels, p.slug AS plan_slug
       FROM customers c
       JOIN plans p ON p.id = c.plan_id
      WHERE c.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function createCustomer({ name, email, phone, password, planSlug }) {
  const hash = await hashPassword(password);
  const { rows: plans } = await pool.query(
    `SELECT id FROM plans WHERE slug = $1`,
    [planSlug || "populaire"]
  );
  const planId = plans[0] ? plans[0].id : null;

  const { rows } = await pool.query(
    `INSERT INTO customers (name, email, phone, password_hash, plan_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, email`,
    [name, email.toLowerCase(), phone || null, hash, planId]
  );
  return rows[0];
}

async function listPlans() {
  const { rows } = await pool.query(
    `SELECT name, slug, max_channels, price_cad
       FROM plans WHERE is_active = TRUE ORDER BY price_cad`
  );
  return rows;
}

module.exports = {
  hashPassword,
  verifyPassword,
  findByEmail,
  findById,
  createCustomer,
  listPlans
};
