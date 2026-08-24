const crypto = require("crypto");
const { pool } = require("../config/db");

const DEVICE_COOKIE = "sf_device";

function classifyUserAgent(ua) {
  if (!ua) return { type: "Autre", platform: "Inconnu" };
  const uaLower = ua.toLowerCase();

  let type = "Navigateur web";
  if (uaLower.includes("iphone") || uaLower.includes("ipad")) type = "iOS";
  else if (uaLower.includes("android")) type = "Android";
  else if (uaLower.includes("apple tv") || uaLower.includes("tvos"))
    type = "Apple TV";
  else if (uaLower.includes("fire tv") || uaLower.includes("aft"))
    type = "Fire TV";
  else if (uaLower.includes("smarttv") || uaLower.includes("tizen") || uaLower.includes("web0s"))
    type = "Téléviseur intelligent";
  else if (uaLower.includes("windows")) type = "Windows";
  else if (uaLower.includes("mac os")) type = "macOS";

  let platform = "Web";
  if (uaLower.includes("iphone")) platform = "iPhone";
  else if (uaLower.includes("ipad")) platform = "iPad";
  else if (/android.*mobile/.test(uaLower)) platform = "Téléphone Android";
  else if (uaLower.includes("android")) platform = "Appareil Android";

  return { type, platform };
}

async function ensureDevice(customerId, token, req) {
  const ua = req.headers["user-agent"] || "";
  const { type, platform } = classifyUserAgent(ua);
  const deviceName = `Appareil ${platform}`;

  const { rows } = await pool.query(
    `INSERT INTO devices (customer_id, device_token, device_name, device_type, platform, app_version, last_active_at)
     VALUES ($1, $2, $3, $4, $5, $6, now())
     ON CONFLICT (customer_id, device_token)
     DO UPDATE SET
       last_active_at = now(),
       device_name = EXCLUDED.device_name,
       device_type = EXCLUDED.device_type,
       platform = EXCLUDED.platform
     RETURNING id`,
    [customerId, token, deviceName, type, platform, req.headers["x-app-version"] || "web"]
  );

  return rows[0].id;
}

function deviceTracker(req, res, next) {
  if (!req.session || !req.session.customerId) return next();

  let token = req.cookies ? req.cookies[DEVICE_COOKIE] : null;
  if (!token) {
    token = crypto.randomBytes(16).toString("hex");
    res.cookie(DEVICE_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 365
    });
  }

  req.deviceToken = token;

  ensureDevice(req.session.customerId, token, req)
    .then(() => next())
    .catch((err) => {
      console.error("[device] suivi impossible:", err.message);
      next();
    });
}

module.exports = { deviceTracker, classifyUserAgent, DEVICE_COOKIE };
