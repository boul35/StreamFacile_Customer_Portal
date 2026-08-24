const crypto = require("crypto");
const { body, validationResult } = require("express-validator");
const { pool } = require("../config/db");
const auth = require("../services/auth");

function buildTicketReference() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `SF-${stamp}-${rand}`;
}

async function getSupportContext(customerId) {
  const customer = await auth.findById(customerId);

  const { rows: channels } = await pool.query(
    `SELECT ch.id, ch.name, ch.category
       FROM customer_channels cc
       JOIN channels ch ON ch.id = cc.channel_id
      WHERE cc.customer_id = $1
      ORDER BY ch.name`,
    [customerId]
  );

  const { rows: devices } = await pool.query(
    `SELECT id, device_name, device_type, platform, last_active_at
       FROM devices WHERE customer_id = $1 ORDER BY last_active_at DESC NULLS LAST`,
    [customerId]
  );

  return { customer, channels, devices };
}

async function showSupport(req, res) {
  const ctx = await getSupportContext(req.session.customerId);
  res.render("support", {
    title: "Centre d'aide — StreamFacile",
    channels: ctx.channels,
    devices: ctx.devices,
    prefillChannel: req.query.chaine || "",
    envoye: req.query.envoye || "",
    errors: [],
    values: {}
  });
}

const ticketValidators = [
  body("subject").trim().notEmpty().withMessage("Le sujet est requis.").isLength({ max: 160 }),
  body("description").trim().notEmpty().withMessage("La description est requise."),
  body("channelId").optional({ checkFalsy: true }).isInt({ min: 1 }),
  body("deviceId").optional({ checkFalsy: true }).isInt({ min: 1 })
];

async function createTicket(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const ctx = await getSupportContext(req.session.customerId);
    return res.status(400).render("support", {
      title: "Centre d'aide — StreamFacile",
      channels: ctx.channels,
      devices: ctx.devices,
      prefillChannel: req.body.channelId || "",
      errors: errors.array(),
      values: req.body
    });
  }

  const customerId = req.session.customerId;
  const channelId = req.body.channelId ? parseInt(req.body.channelId, 10) : null;
  const deviceId = req.body.deviceId ? parseInt(req.body.deviceId, 10) : null;

  const customer = await auth.findById(customerId);

  const { rows: channelRows } = channelId
    ? await pool.query(`SELECT id, name, category, external_id FROM channels WHERE id = $1`, [channelId])
    : [{ rows: [] }];
  const channel = channelRows[0] || null;

  const { rows: deviceRows } = deviceId
    ? await pool.query(`SELECT id, device_name, device_type, platform FROM devices WHERE id = $1 AND customer_id = $2`, [deviceId, customerId])
    : [{ rows: [] }];
  const selectedDevice = deviceRows[0] || null;

  const context = {
    captured_at: new Date().toISOString(),
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      plan: customer.plan_name,
      max_channels: customer.max_channels,
      renewal_date: customer.renewal_date
    },
    channel: channel
      ? { id: channel.id, name: channel.name, category: channel.category }
      : null,
    device: selectedDevice
      ? {
          id: selectedDevice.id,
          name: selectedDevice.device_name,
          type: selectedDevice.device_type,
          platform: selectedDevice.platform
        }
      : null,
    request: {
      user_agent: req.headers["user-agent"] || null,
      ip: req.ip,
      app_version: req.headers["x-app-version"] || "web",
      locale: req.headers["accept-language"] || null
    }
  };

  const reference = buildTicketReference();
  const { rows } = await pool.query(
    `INSERT INTO tickets
       (reference, customer_id, channel_id, device_id, subject, description, context_json)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, reference`,
    [
      reference,
      customerId,
      channel ? channel.id : null,
      selectedDevice ? selectedDevice.id : null,
      req.body.subject,
      req.body.description,
      JSON.stringify(context)
    ]
  );

  res.redirect(`/support?envoye=${rows[0].reference}`);
}

async function listTickets(req, res) {
  const { rows } = await pool.query(
    `SELECT t.id, t.reference, t.subject, t.status, t.created_at,
            ch.name AS channel_name
       FROM tickets t
       LEFT JOIN channels ch ON ch.id = t.channel_id
      WHERE t.customer_id = $1
      ORDER BY t.created_at DESC
      LIMIT 25`,
    [req.session.customerId]
  );

  res.json({ ok: true, tickets: rows });
}

module.exports = {
  showSupport,
  createTicket,
  listTickets,
  ticketValidators
};
