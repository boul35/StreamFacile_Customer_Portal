require("dotenv").config();

const config = {
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

module.exports = config;
