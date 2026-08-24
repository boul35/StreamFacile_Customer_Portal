require("dotenv").config();

const nodeEnv = (process.env.NODE_ENV || "development").toLowerCase();
const isProd = nodeEnv === "production";

const config = {
  nodeEnv,
  isProd,
  databaseUrl: process.env.DATABASE_URL,
  sessionSecret: process.env.SESSION_SECRET || "dev-secret",
  port: parseInt(process.env.PORT || "3000", 10),

  dispatcharr: {
    baseUrl: process.env.DISPATCHARR_BASE_URL || "",
    apiKey: process.env.DISPATCHARR_API_KEY || "",
    accountId: process.env.DISPATCHARR_ACCOUNT_ID || "",
    simulation: (process.env.DISPATCHARR_SIMULATION || "true") === "true",
    timeoutMs: parseInt(process.env.PROVISIONING_TIMEOUT_MS || "120000", 10)
  }
};

function validate() {
  const errors = [];
  if (!config.databaseUrl) {
    errors.push("DATABASE_URL est requis (chaîne de connexion PostgreSQL).");
  }
  if (isProd && config.sessionSecret === "dev-secret") {
    errors.push("SESSION_SECRET doit être défini explicitement en production.");
  }
  if (errors.length) {
    throw new Error("Configuration invalide:\n- " + errors.join("\n- "));
  }
}

module.exports = config;
module.exports.validate = validate;
