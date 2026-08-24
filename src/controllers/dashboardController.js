const { pool } = require("../config/db");
const auth = require("../services/auth");
const channelController = require("./channelController");

async function showDashboard(req, res) {
  const customerId = req.session.customerId;
  const customer = await auth.findById(customerId);

  const ctx = await channelController.getSelectionContext(customerId);

  const { rows: devices } = await pool.query(
    `SELECT device_name, device_type, platform, last_active_at
       FROM devices WHERE customer_id = $1 ORDER BY last_active_at DESC NULLS LAST LIMIT 5`,
    [customerId]
  );

  const { rows: stats } = await pool.query(
    `SELECT
        (SELECT count(*) FROM channels WHERE is_active = TRUE) AS catalog_total,
        (SELECT count(*) FROM customer_channels WHERE customer_id = $1) AS selected_total,
        (SELECT count(*) FROM tickets WHERE customer_id = $1 AND status IN ('ouvert','en_cours')) AS open_tickets,
        (SELECT count(*) FROM devices WHERE customer_id = $1) AS device_count`,
    [customerId]
  );

  const { rows: lastJob } = await pool.query(
    `SELECT status, created_at FROM provisioning_jobs
      WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [customerId]
  );

  const s = stats[0];

  res.render("dashboard", {
    title: "Tableau de bord — StreamFacile",
    customer,
    selected: ctx.selected,
    maxChannels: ctx.maxChannels,
    remaining: Math.max(0, ctx.maxChannels - ctx.selected),
    devices,
    openTickets: parseInt(s.open_tickets, 10),
    deviceCount: parseInt(s.device_count, 10),
    catalogTotal: parseInt(s.catalog_total, 10),
    lastJob: lastJob[0] || null
  });
}

module.exports = { showDashboard };
