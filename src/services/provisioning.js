const { pool } = require("../config/db");
const { createProvisioner } = require("./provisioner");

async function getCustomerWithChannels(customerId) {
  const { rows: customers } = await pool.query(
    `SELECT c.*, p.name AS plan_name, p.max_channels, p.renewal_days
       FROM customers c
       JOIN plans p ON p.id = c.plan_id
      WHERE c.id = $1`,
    [customerId]
  );

  if (!customers.length) return null;

  const { rows: channels } = await pool.query(
    `SELECT ch.id, ch.external_id, ch.name, ch.category
       FROM customer_channels cc
       JOIN channels ch ON ch.id = cc.channel_id
      WHERE cc.customer_id = $1
      ORDER BY ch.name`,
    [customerId]
  );

  return { customer: customers[0], channels };
}

async function enqueueJob(customerId) {
  const { rows } = await pool.query(
    `INSERT INTO provisioning_jobs (customer_id, status, selected_channels)
     VALUES ($1, 'en_attente', 0)
     RETURNING *`,
    [customerId]
  );
  return rows[0];
}

async function processJob(jobId) {
  const { rows: jobs } = await pool.query(
    `SELECT * FROM provisioning_jobs WHERE id = $1`,
    [jobId]
  );

  const job = jobs[0];
  if (!job) throw new Error("Travail introuvable");

  if (job.status === "en_cours" || job.status === "reussi") {
    return job;
  }

  await pool.query(
    `UPDATE provisioning_jobs SET status = 'en_cours' WHERE id = $1`,
    [jobId]
  );

  const loaded = await getCustomerWithChannels(job.customer_id);
  if (!loaded) throw new Error("Client introuvable");

  const provisioner = createProvisioner();

  try {
    const result = await provisioner.provision(
      loaded.customer,
      loaded.channels
    );

    await pool.query(
      `UPDATE provisioning_jobs
          SET status = 'reussi',
              selected_channels = $2,
              result_json = $3,
              completed_at = now()
        WHERE id = $1`,
      [jobId, loaded.channels.length, JSON.stringify(result)]
    );

    return { id: jobId, status: "reussi", result };
  } catch (err) {
    await pool.query(
      `UPDATE provisioning_jobs
          SET status = 'echec',
              error_message = $2,
              completed_at = now()
        WHERE id = $1`,
      [jobId, err.message]
    );

    return { id: jobId, status: "echec", error: err.message };
  }
}

module.exports = {
  getCustomerWithChannels,
  enqueueJob,
  processJob
};
