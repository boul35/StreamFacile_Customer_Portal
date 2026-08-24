const request = require("supertest");
const bcrypt = require("bcryptjs");
const { pool } = require("../src/config/db");
const app = require("../src/app");

afterAll(async () => {
  await pool.end();
});

const TEST_EMAIL = "limite@test.streamfacile.qc.ca";
const TEST_PASSWORD = "streamfacile123";

describe("Sélection de chaînes (limite max_channels)", () => {
  let agent;

  beforeAll(async () => {
    const hash = await bcrypt.hash(TEST_PASSWORD, 12);
    await pool.query(
      `INSERT INTO plans (name, slug, max_channels, price_cad, renewal_days)
       VALUES ('Test', 'test-limite', 2, 0, 30)
       ON CONFLICT (slug) DO NOTHING`
    );
    await pool.query(`DELETE FROM customers WHERE email = $1`, [TEST_EMAIL]);
    await pool.query(
      `INSERT INTO customers (name, email, phone, password_hash, plan_id)
       VALUES ($1, $2, $3, $4, (SELECT id FROM plans WHERE slug = 'test-limite'))`,
      ["Client Limite", TEST_EMAIL, "418 555-0101", hash]
    );

    agent = request.agent(app);
    const login = await agent
      .post("/connexion")
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    expect(login.statusCode).toBe(302);
  });

  it("GET /chaines renvoie 200 pour un client authentifié", async () => {
    const res = await agent.get("/chaines");
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain("Catalogue de chaînes");
  });

  it("refuse d'ajouter une chaîne au-delà de la limite (2)", async () => {
    const r1 = await agent.post("/chaines/basculer").send({ channelId: 1 });
    expect(r1.statusCode).toBe(200);
    expect(r1.body.ok).toBe(true);
    expect(r1.body.selected).toBe(true);

    const r2 = await agent.post("/chaines/basculer").send({ channelId: 2 });
    expect(r2.statusCode).toBe(200);
    expect(r2.body.ok).toBe(true);
    expect(r2.body.selectedCount).toBe(2);

    const r3 = await agent.post("/chaines/basculer").send({ channelId: 3 });
    expect(r3.statusCode).toBe(409);
    expect(r3.body.ok).toBe(false);
    expect(r3.body.atLimit).toBe(true);
  });

  it("permet de retirer une chaîne puis d'en ajouter une autre", async () => {
    const remove = await agent.post("/chaines/basculer").send({ channelId: 1 });
    expect(remove.body.selected).toBe(false);
    expect(remove.body.selectedCount).toBe(1);

    const add = await agent.post("/chaines/basculer").send({ channelId: 3 });
    expect(add.statusCode).toBe(200);
    expect(add.body.ok).toBe(true);
  });
});
