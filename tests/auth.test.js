const request = require("supertest");
const { pool } = require("../src/config/db");
const app = require("../src/app");

afterAll(async () => {
  await pool.end();
});

describe("Authentification", () => {
  it("GET /connexion affiche la page de connexion (200)", async () => {
    const res = await request(app).get("/connexion");
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain("Connexion");
  });

  it("POST /connexion avec un mauvais mot de passe renvoie 401", async () => {
    const res = await request(app)
      .post("/connexion")
      .send({ email: "demo@streamfacile.qc.ca", password: "mauvais-mot-de-passe" });
    expect(res.statusCode).toBe(401);
  });

  it("POST /connexion avec le compte démo redirige vers le tableau de bord (302)", async () => {
    const res = await request(app)
      .post("/connexion")
      .send({ email: "demo@streamfacile.qc.ca", password: "streamfacile123" });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/");
  });
});
