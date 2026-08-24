const { pool } = require("../config/db");
const provisioning = require("../services/provisioning");

async function showProvisioning(req, res) {
  const customerId = req.session.customerId;

  const { rows: jobs } = await pool.query(
    `SELECT id, status, selected_channels, provider, error_message, created_at, completed_at
       FROM provisioning_jobs
      WHERE customer_id = $1
      ORDER BY created_at DESC
      LIMIT 10`,
    [customerId]
  );

  const ctx = await provisioning.getCustomerWithChannels(customerId);

  res.render("provisioning", {
    title: "Approvisionnement — StreamFacile",
    jobs,
    channelCount: ctx ? ctx.channels.length : 0,
    customer: ctx ? ctx.customer : null
  });
}

async function triggerProvisioning(req, res) {
  const customerId = req.session.customerId;

  const ctx = await provisioning.getCustomerWithChannels(customerId);
  if (!ctx || ctx.channels.length === 0) {
    return res.status(400).render("provisioning", {
      title: "Approvisionnement — StreamFacile",
      jobs: [],
      channelCount: 0,
      customer: ctx ? ctx.customer : null,
      flash: {
        type: "error",
        message: "Veuillez sélectionner au moins une chaîne avant de synchroniser."
      }
    });
  }

  const job = await provisioning.enqueueJob(customerId);

  provisioning
    .processJob(job.id)
    .catch((err) => console.error("[provisioning] échec:", err.message));

  res.redirect(`/approvisionnement?job=${job.id}`);
}

async function jobStatus(req, res) {
  const customerId = req.session.customerId;
  const jobId = parseInt(req.params.id, 10);

  const { rows } = await pool.query(
    `SELECT id, status, selected_channels, result_json, error_message, completed_at
       FROM provisioning_jobs
      WHERE id = $1 AND customer_id = $2`,
    [jobId, customerId]
  );

  if (!rows.length) {
    return res.status(404).json({ ok: false, message: "Travail introuvable." });
  }

  const job = rows[0];
  res.json({
    ok: true,
    id: job.id,
    status: job.status,
    selectedChannels: job.selected_channels,
    done: job.status === "reussi" || job.status === "echec",
    error: job.error_message || null
  });
}

module.exports = { showProvisioning, triggerProvisioning, jobStatus };
